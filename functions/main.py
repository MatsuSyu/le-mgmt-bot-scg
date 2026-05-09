import os
import json
import logging
import base64
from firebase_functions import https_fn, options, scheduler_fn
from firebase_admin import initialize_app
from services.gemini_service import GeminiService
from services.line_service import LineService
from services.firestore_service import FirestoreService
from services.sheets_service import SheetsService
from services.log_service import LogService
from services.mail_service import MailService
from utils.signature import verify_line_signature
from config import config, LINE_CHANNEL_SECRET_KEY, LINE_CHANNEL_ACCESS_TOKEN_KEY, GEMINI_API_KEY_KEY, GMAIL_CREDENTIALS_JSON_KEY

options.set_global_options(
    region="us-central1"
)

initialize_app()

@https_fn.on_request(
    secrets=[LINE_CHANNEL_SECRET_KEY, LINE_CHANNEL_ACCESS_TOKEN_KEY, GEMINI_API_KEY_KEY],
    invoker="public"
)
def line_webhook(req: https_fn.Request) -> https_fn.Response:
    logging.info(f"Webhook received. Method: {req.method}")
    signature = req.headers.get("x-line-signature", "")
    body = req.get_data(as_text=True)
    logging.info(f"Request body: {body}")

    if not verify_line_signature(body, signature):
        logging.warning("Invalid LINE signature")
        return https_fn.Response("Invalid signature", status=401)

    try:
        data = json.loads(body)
        events = data.get("events", [])
        line = LineService()
        gemini = GeminiService()
        
        for event in events:
            if event["type"] == "message" and event["message"]["type"] == "text":
                source = event.get("source", {})
                source_type = source.get("type")
                
                # In groups/rooms, only respond if mentioned
                if source_type in ["group", "room"]:
                    mentions = event["message"].get("mention", {}).get("mentionees", [])
                    # If no mentions are present, we skip processing this message
                    if not mentions:
                        continue
                
                reply_token = event["replyToken"]
                user_message = event["message"]["text"]
                
                # Get schedule and attendance info for context
                fs = FirestoreService()
                schedules = fs.get_active_schedules(limit=10)
                
                # Fetch attendance for the next 3 schedules for more detailed context
                attendance_context = ""
                if schedules:
                    next_few_ids = [s["id"] for s in schedules[:3]]
                    attendance = fs.get_attendance_for_schedules(next_few_ids)
                    members = fs.get_all_members()
                    member_map = {m["id"]: m.get("short_name") or m.get("name") for m in members}
                    
                    att_summary = {}
                    for sid in next_few_ids:
                        att_summary[sid] = {"出席": [], "欠席": [], "未回答": []}
                        
                        answered_user_ids = set()
                        for a in [att for att in attendance if att["schedule_id"] == sid]:
                            name = member_map.get(a["user_id"], "不明")
                            answered_user_ids.add(a["user_id"])
                            if a.get("status") == "出席": att_summary[sid]["出席"].append(name)
                            elif a.get("status") == "欠席": att_summary[sid]["欠席"].append(name)
                        
                        # Find unanswered
                        unanswered = [m.get("short_name") or m.get("name") for m in members if m["id"] not in answered_user_ids]
                        att_summary[sid]["未回答"] = unanswered[:15] # Limit for context size
                    
                    attendance_context = f"\n直近3件の出欠状況(出席者名・未回答者名): {json.dumps(att_summary, ensure_ascii=False)}"

                user_id = source.get("userId")
                member_info = fs.get_members_by_line_id(user_id) if user_id else []
                user_context = f"\n発信者情報: {'連携済み (' + member_info[0]['name'] + ')' if member_info else '未連携'}"
                
                schedule_context = f"予定データ: {json.dumps(schedules, ensure_ascii=False)}{attendance_context}{user_context}"
                
                # Use Gemini for intelligent reply
                reply_data = gemini.generate_bot_reply(user_message, context=schedule_context)
                logging.info(f"Gemini reply data: {json.dumps(reply_data, ensure_ascii=False)}")
                response_text = reply_data.get("text") or "了解しました！"
                
                # Execute tool calls if any
                tool_calls = reply_data.get("tool_calls", [])
                for call in tool_calls:
                    logging.info(f"Executing tool call: {call['name']} with args: {call['args']}")
                    if call["name"] == "register_schedule":
                        try:
                            # Parse date and other fields
                            schedule_data = call["args"]
                            # Ensure target_categories is a list if it comes as a string or is missing
                            target_categories = schedule_data.get("target_categories", ["all"])
                            if not isinstance(target_categories, list):
                                target_categories = [target_categories]
                            schedule_data["target_categories"] = target_categories
                            
                            # Check for existing schedule on the same day/category for deduplication
                            existing_id = None
                            if "date" in schedule_data:
                                try:
                                    dt = None
                                    if isinstance(schedule_data["date"], str):
                                        if len(schedule_data["date"]) == 10:
                                            dt = datetime.strptime(schedule_data["date"], "%Y-%m-%d")
                                        else:
                                            dt = datetime.fromisoformat(schedule_data["date"].replace("Z", "+00:00"))
                                    
                                    if dt:
                                        existing_id = fs.find_existing_schedule(dt, target_categories)
                                except Exception as e:
                                    logging.warning(f"Deduplication check failed: {e}")

                            change_summary = "Botによる更新" if existing_id else "Botによる新規登録"
                            _, new_id = fs.update_schedule_with_history(existing_id, schedule_data, change_summary=change_summary)
                            logging.info(f"Bot processed schedule: {new_id} (Updated: {bool(existing_id)})")
                        except Exception as e:
                            logging.error(f"Bot tool execution failed: {str(e)}", exc_info=True)
                    
                    elif call["name"] == "get_member_list":
                        try:
                            role_filter = call.get("args", {}).get("role")
                            all_members = fs.get_all_members()
                            if role_filter:
                                filtered = [m for m in all_members if m.get("role") == role_filter]
                            else:
                                filtered = all_members
                            
                            names = [m.get("name", "不明") for m in filtered]
                            summary = f"\n該当メンバー({len(names)}名): " + "、".join(names[:20])
                            if len(names) > 20:
                                summary += f" 他{len(names)-20}名"
                            
                            if response_text == "了解しました！" or not response_text:
                                response_text = f"はい！メンバーリストですね。{summary}"
                            else:
                                response_text += summary
                        except Exception as e:
                            logging.error(f"Error in get_member_list tool: {e}")

                    elif call["name"] == "register_ground_reservation":
                        try:
                            res_data = call["args"]
                            res_id = fs.update_ground_reservation(res_data)
                            logging.info(f"Bot registered ground reservation: {res_id}")
                        except Exception as e:
                            logging.error(f"register_ground_reservation tool execution failed: {str(e)}", exc_info=True)

                line.reply_message(reply_token, response_text)
                
                # Record the conversation log with structured data
                try:
                    user_id = source.get("userId")
                    group_id = source.get("groupId") or source.get("roomId")
                    
                    log_service = LogService()
                    log_service.record_action(
                        "BOT_CHAT", 
                        f"Chat Message", 
                        user_id,
                        user_input=user_message,
                        bot_response=response_text,
                        group_id=group_id,
                        source_type=source_type
                    )
                except Exception as e:
                    logging.error(f"Failed to log chat: {str(e)}")

        return https_fn.Response("OK")
    except Exception as e:
        logging.error(f"LINE Webhook error: {str(e)}", exc_info=True)
        return https_fn.Response("Internal Error", status=500)

@https_fn.on_request(
    secrets=[LINE_CHANNEL_ACCESS_TOKEN_KEY],
    cors=options.CorsOptions(cors_origins="*", cors_methods=["get", "post"]),
    invoker="public"
)
def submit_attendance(req: https_fn.Request) -> https_fn.Response:
    try:
        if req.method == "OPTIONS":
            return https_fn.Response("OK")

        data = req.get_json(silent=True)
        if data is None:
            try:
                data = json.loads(req.get_data(as_text=True))
            except:
                return https_fn.Response(json.dumps({"status": "error", "message": "Invalid JSON"}), status=400, mimetype="application/json")
        
        user_ids = data.get("user_ids", []) 
        schedule_id = data.get("schedule_id")
        status = data.get("status")
        car_info = data.get("car_info", {})
        remarks = data.get("remarks", "")
        
        fs = FirestoreService()
        for uid in user_ids:
            fs.update_attendance(uid, schedule_id, status, car_info, remarks)
        
        # Trigger Sheet Sync
        try:
            sheets = SheetsService()
            members = fs.get_all_members()
            schedule = fs.get_schedule(schedule_id)
            attendance = fs.get_schedule_attendance(schedule_id)
            if schedule:
                sheets.sync_detailed_report(schedule, members, attendance)
            
            # Update overall dashboard
            active_schedules = fs.get_active_schedules(limit=10)
            all_att = {s["id"]: fs.get_schedule_attendance(s["id"]) for s in active_schedules}
            sheets.sync_attendance_dashboard(active_schedules, members, all_att)
        except Exception as e:
            logging.error(f"Post-submission sheet sync failed: {str(e)}")

        return https_fn.Response(json.dumps({"status": "success"}), mimetype="application/json")
    except Exception as e:
        logging.error(f"Submission error: {str(e)}", exc_info=True)
        return https_fn.Response(json.dumps({"status": "error", "message": str(e)}), status=500, mimetype="application/json")

@https_fn.on_request(
    cors=options.CorsOptions(cors_origins="*", cors_methods=["get", "post"]),
    invoker="public"
)
def sync_all_sheets(req: https_fn.Request) -> https_fn.Response:
    """Manually trigger a full sync of all active schedules to sheets."""
    try:
        if req.method == "OPTIONS": return https_fn.Response("OK")
        fs = FirestoreService()
        sheets = SheetsService()
        members = fs.get_all_members()
        active_schedules = fs.get_active_schedules(limit=10)
        
        all_att = {}
        for s in active_schedules:
            attendance = fs.get_schedule_attendance(s["id"])
            all_att[s["id"]] = attendance
            sheets.sync_detailed_report(s, members, attendance)
            
        sheets.sync_attendance_dashboard(active_schedules, members, all_att)
        return https_fn.Response(json.dumps({"status": "success"}), mimetype="application/json")
    except Exception as e:
        logging.error(f"Manual sync failed: {str(e)}")
        return https_fn.Response(str(e), status=500)

@https_fn.on_request(
    secrets=[GEMINI_API_KEY_KEY, LINE_CHANNEL_ACCESS_TOKEN_KEY],
    cors=options.CorsOptions(cors_origins="*", cors_methods=["get", "post"]),
    invoker="public"
)
def update_schedule_admin(req: https_fn.Request) -> https_fn.Response:
    try:
        if req.method == "OPTIONS": return https_fn.Response("OK")
        
        # Robust JSON parsing
        data = req.get_json(silent=True)
        if data is None:
            try:
                data = json.loads(req.get_data(as_text=True))
            except Exception as e:
                logging.error(f"JSON Parse Error: {str(e)}")
                return https_fn.Response(json.dumps({"status": "error", "message": "Invalid JSON"}), status=400, mimetype="application/json")
        
        logging.info(f"Update Schedule Admin called with data: {json.dumps(data)}")
        
        # Support both {"id": "...", "data": {...}} and flat {...} structures
        schedule_id = data.get("id")
        if "data" in data and isinstance(data["data"], dict):
            new_data = data.get("data")
        else:
            # Assume it's a flat structure, but remove 'id' if present
            new_data = {k: v for k, v in data.items() if k != "id"}
        
        fs = FirestoreService()
        old_data, final_id = fs.update_schedule_with_history(schedule_id, new_data)
        
        if not final_id:
            raise Exception("Failed to update/create schedule in Firestore")

        logging.info(f"Firestore update successful. ID: {final_id}")

        # If it was an update or creation success, proceed to AI and Sheets (non-blocking)
        try:
            # AI Change Comment (only for existing schedules with old data)
            if old_data:
                gemini = GeminiService()
                change_comment = gemini.analyze_schedule_change(old_data, new_data)
                fs.db.collection("schedules").document(final_id).update({"ai_change_comment": change_comment})
            
            # Trigger Sheet Sync
            sheets = SheetsService()
            if sheets.spreadsheet_id:
                members = fs.get_all_members()
                full_schedule = fs.get_schedule(final_id)
                if full_schedule:
                    attendance = fs.get_schedule_attendance(final_id)
                    sheets.sync_detailed_report(full_schedule, members, attendance)
                    
                # Update overall dashboard
                active_schedules = fs.get_active_schedules(limit=10)
                all_att = {s["id"]: fs.get_schedule_attendance(s["id"]) for s in active_schedules}
                sheets.sync_attendance_dashboard(active_schedules, members, all_att)
        except Exception as e:
            logging.error(f"Post-update auxiliary tasks failed: {str(e)}")

        return https_fn.Response(json.dumps({"status": "success", "id": final_id}), mimetype="application/json")
    except Exception as e:
        logging.error(f"Error in update_schedule_admin: {str(e)}", exc_info=True)
        return https_fn.Response(json.dumps({"status": "error", "message": str(e)}), status=500, mimetype="application/json")

@https_fn.on_request(
    cors=options.CorsOptions(cors_origins="*", cors_methods=["get"]),
    invoker="public"
)
def get_active_schedules(req: https_fn.Request) -> https_fn.Response:
    try:
        if req.method == "OPTIONS": return https_fn.Response("OK")
        fs = FirestoreService()
        schedules = fs.get_active_schedules()
        
        return https_fn.Response(json.dumps(schedules, ensure_ascii=False), mimetype="application/json")
    except Exception as e:
        return https_fn.Response(json.dumps({"error": str(e)}), status=500, mimetype="application/json")

@https_fn.on_request(
    cors=options.CorsOptions(cors_origins="*", cors_methods=["get", "post"]),
    invoker="public"
)
def member_linkage(req: https_fn.Request) -> https_fn.Response:
    try:
        if req.method == "OPTIONS": return https_fn.Response("OK")
        fs = FirestoreService()
        if req.method == "GET":
            line_user_id = req.args.get("line_user_id")
            if line_user_id:
                members = fs.get_members_by_line_id(line_user_id)
            else:
                members = fs.get_unlinked_members()
            return https_fn.Response(json.dumps(members, ensure_ascii=False), mimetype="application/json")
        else:
            # Robust JSON parsing
            data = req.get_json(silent=True)
            if data is None:
                try:
                    data = json.loads(req.get_data(as_text=True))
                except:
                    return https_fn.Response(json.dumps({"status": "error", "message": "Invalid JSON"}), status=400, mimetype="application/json")
            
            line = LineService()
            line_user_id = data["line_user_id"]
            line_display_name = None
            try:
                profile = line.get_profile(line_user_id)
                line_display_name = profile.get("displayName")
            except Exception as e:
                logging.warning(f"Could not fetch LINE profile for {line_user_id}: {e}")

            fs.link_member(data["member_id"], line_user_id, line_display_name)
            return https_fn.Response(json.dumps({"status": "success"}), mimetype="application/json")
    except Exception as e:
        return https_fn.Response(json.dumps({"status": "error", "message": str(e)}), status=500, mimetype="application/json")

@https_fn.on_request(
    cors=options.CorsOptions(cors_origins="*", cors_methods=["get"]),
    invoker="public"
)
def get_unique_suggestions(req: https_fn.Request) -> https_fn.Response:
    try:
        if req.method == "OPTIONS": return https_fn.Response("OK")
        fs = FirestoreService()
        fields = ["location", "tournament_name", "opponent"]
        suggestions = fs.get_unique_field_values(fields)
        return https_fn.Response(json.dumps(suggestions, ensure_ascii=False), mimetype="application/json")
    except Exception as e:
        return https_fn.Response(str(e), status=500)

@https_fn.on_request(
    cors=options.CorsOptions(cors_origins="*", cors_methods=["get", "post"]),
    invoker="public"
)
def init_liff_app(req: https_fn.Request) -> https_fn.Response:
    try:
        if req.method == "OPTIONS": return https_fn.Response("OK")
        line_user_id = req.args.get("line_user_id", "")
        
        fs = FirestoreService()
        
        # 1. Fetch active schedules
        schedules = fs.get_active_schedules(limit=20)
        schedule_ids = [s["id"] for s in schedules]
        
        # 2. Fetch members and linkage
        linked_members = []
        if line_user_id:
            linked_members = fs.get_members_by_line_id(line_user_id)
            
        unlinked_members = fs.get_unlinked_members()
        all_members = fs.get_all_members() # For mapping names in attendance summary
        
        # 3. Fetch attendance summary
        attendance = fs.get_attendance_for_schedules(schedule_ids)
        
        response_data = {
            "schedules": schedules,
            "linked_members": linked_members,
            "unlinked_members": unlinked_members,
            "all_members": all_members,
            "attendance": attendance
        }
        
        return https_fn.Response(json.dumps(response_data, ensure_ascii=False), mimetype="application/json")
    except Exception as e:
        logging.error(f"Init LIFF failed: {str(e)}", exc_info=True)
        return https_fn.Response(json.dumps({"status": "error", "message": str(e)}), status=500, mimetype="application/json")

@https_fn.on_request(
    cors=options.CorsOptions(cors_origins="*", cors_methods=["post"]),
    invoker="public"
)
def unlink_liff_member(req: https_fn.Request) -> https_fn.Response:
    try:
        if req.method == "OPTIONS": return https_fn.Response("OK")
        data = req.get_json(silent=True) or {}
        member_id = data.get("member_id")
        if not member_id:
            return https_fn.Response(json.dumps({"status": "error", "message": "Missing member_id"}), status=400, mimetype="application/json")
        
        fs = FirestoreService()
        fs.unlink_member(member_id)
        return https_fn.Response(json.dumps({"status": "success"}), mimetype="application/json")
    except Exception as e:
        return https_fn.Response(json.dumps({"status": "error", "message": str(e)}), status=500, mimetype="application/json")

@https_fn.on_request(
    secrets=[LINE_CHANNEL_ACCESS_TOKEN_KEY],
    cors=options.CorsOptions(cors_origins="*", cors_methods=["get", "post"]),
    invoker="public"
)
def get_line_profile(req: https_fn.Request) -> https_fn.Response:
    try:
        if req.method == "OPTIONS": return https_fn.Response("OK")
        
        # Get user_id from query params or JSON body
        user_id = req.args.get("user_id")
        if not user_id:
            data = req.get_json(silent=True)
            if data: user_id = data.get("user_id")
            
        if not user_id:
            return https_fn.Response("Missing user_id", status=400, mimetype="application/json")
        
        line = LineService()
        profile = line.get_profile(user_id)
        return https_fn.Response(json.dumps(profile, ensure_ascii=False), mimetype="application/json")
    except Exception as e:
        logging.error(f"Get profile error: {str(e)}")
        return https_fn.Response(str(e), status=500)

@https_fn.on_request(
    secrets=[LINE_CHANNEL_ACCESS_TOKEN_KEY],
    cors=options.CorsOptions(cors_origins="*", cors_methods=["post"]),
    invoker="public"
)
def broadcast_message(req: https_fn.Request) -> https_fn.Response:
    """Sends a message to all linked LINE users."""
    try:
        if req.method == "OPTIONS": return https_fn.Response("OK")
        data = req.get_json(silent=True) or {}
        message = data.get("message")
        if not message:
            return https_fn.Response("Missing message", status=400)
            
        fs = FirestoreService()
        line = LineService()
        members = fs.get_all_members()
        
        # Get unique line_user_ids
        line_ids = {m.get("line_user_id") for m in members if m.get("line_user_id")}
        
        count = 0
        for line_id in line_ids:
            try:
                line.push_message(line_id, message)
                count += 1
            except Exception as e:
                logging.error(f"Failed to push to {line_id}: {e}")
                
        # Log this action
        log_service = LogService()
        log_service.record_action("BROADCAST", f"Sent message to {count} users", "ADMIN", message=message)
        
        return https_fn.Response(json.dumps({"status": "success", "sent_count": count}), mimetype="application/json")
    except Exception as e:
        logging.error(f"Broadcast error: {str(e)}")
        return https_fn.Response(str(e), status=500)

@scheduler_fn.on_schedule(
    schedule="every 10 minutes",
    secrets=[GMAIL_CREDENTIALS_JSON_KEY, GEMINI_API_KEY_KEY, LINE_CHANNEL_ACCESS_TOKEN_KEY]
)
def check_gmail_trial_requests(event: scheduler_fn.ScheduledEvent) -> None:
    """Periodically checks for new trial request emails and notifies admin."""
    _check_gmail_trial_requests_logic()

def _check_gmail_trial_requests_logic() -> None:
    """Internal logic for checking Gmail trial requests."""
    try:
        logging.info("Starting scheduled Gmail check...")
        mail_service = MailService(config.gmail_credentials_json)
        if not mail_service.service:
            logging.error("MailService initialization failed in scheduled task.")
            return

        # Search for unread messages sent to the mailing list
        query = f"is:unread to:{config.mailing_list_email}"
        messages = mail_service.list_messages(query=query, max_results=10)
        
        if not messages:
            logging.info("No new trial request emails found.")
            return

        gemini = GeminiService()
        line = LineService()
        log_service = LogService()

        for msg in messages:
            msg_id = msg['id']
            email_content = mail_service.get_message_content(msg_id)
            
            if not email_content:
                continue
                
            # Analyze with Gemini
            trial_info = gemini.extract_trial_info(email_content)
            
            if "error" in trial_info:
                logging.error(f"Gemini analysis failed for {msg_id}: {trial_info['error']}")
                continue
                
            # Notify admin via LINE
            message_to_admin = trial_info.get("message", "新しい体験希望メールを受信しました！")
            line.send_admin_notification(message_to_admin)
            
            # Record log
            log_service.record_action("MAIL_DETECTION", f"Trial request: {trial_info['data'].get('name', 'Unknown')}", "SYSTEM")
            
            # Mark as read
            mail_service.mark_as_read(msg_id)
            logging.info(f"Processed and marked as read: {msg_id}")

    except Exception as e:
        logging.error(f"Scheduled Gmail check error: {str(e)}", exc_info=True)
