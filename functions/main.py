import os
import json
import logging
from firebase_functions import https_fn, options
from firebase_admin import initialize_app
from services.gemini_service import GeminiService
from services.line_service import LineService
from services.firestore_service import FirestoreService
from services.sheets_service import SheetsService
from services.log_service import LogService
from utils.signature import verify_line_signature
from config import config, LINE_CHANNEL_SECRET_KEY, LINE_CHANNEL_ACCESS_TOKEN_KEY, GEMINI_API_KEY_KEY

options.set_global_options(
    region="us-central1"
)

initialize_app()

@https_fn.on_request(
    secrets=[LINE_CHANNEL_SECRET_KEY, LINE_CHANNEL_ACCESS_TOKEN_KEY, GEMINI_API_KEY_KEY],
    invoker="public"
)
def line_webhook(req: https_fn.Request) -> https_fn.Response:
    signature = req.headers.get("x-line-signature", "")
    body = req.get_data(as_text=True)

    if not verify_line_signature(body, signature):
        return https_fn.Response("Invalid signature", status=401)

    try:
        events = req.get_json().get("events", [])
        line = LineService()
        gemini = GeminiService()
        
        for event in events:
            if event["type"] == "message" and event["message"]["type"] == "text":
                reply_token = event["replyToken"]
                user_message = event["message"]["text"]
                
                # Use Gemini for intelligent reply
                response_text = gemini.generate_bot_reply(user_message)
                line.reply_message(reply_token, response_text)

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
            except:
                return https_fn.Response(json.dumps({"status": "error", "message": "Invalid JSON"}), status=400, mimetype="application/json")
        
        # Support both {"id": "...", "data": {...}} and flat {...} structures
        schedule_id = data.get("id")
        if "data" in data and isinstance(data["data"], dict):
            new_data = data.get("data")
        else:
            # Assume it's a flat structure, but remove 'id' if present
            new_data = {k: v for k, v in data.items() if k != "id"}
        
        fs = FirestoreService()
        old_data, schedule_id = fs.update_schedule_with_history(schedule_id, new_data)
        
        # If it was an update or creation success
        if schedule_id:
            gemini = GeminiService()
            change_comment = gemini.analyze_schedule_change(old_data, new_data)
            fs.db.collection("schedules").document(schedule_id).update({"ai_change_comment": change_comment})
            
            # Trigger Sheet Sync for this schedule
            try:
                sheets = SheetsService()
                members = fs.get_all_members()
                # Refetch full schedule with new ID/comment
                full_schedule = fs.get_schedule(schedule_id)
                if full_schedule:
                    full_schedule["id"] = schedule_id
                    attendance = fs.get_schedule_attendance(schedule_id)
                    sheets.sync_detailed_report(full_schedule, members, attendance)
                    
                # Update overall dashboard
                active_schedules = fs.get_active_schedules(limit=10)
                all_att = {s["id"]: fs.get_schedule_attendance(s["id"]) for s in active_schedules}
                sheets.sync_attendance_dashboard(active_schedules, members, all_att)
            except Exception as e:
                logging.error(f"Sheet sync failed after schedule update: {str(e)}")

        return https_fn.Response(json.dumps({"status": "success"}), mimetype="application/json")
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
        
        enhanced_schedules = []
        for s in schedules:
            attendance = fs.get_schedule_attendance(s["id"])
            # Attendance summary by role
            summary = {"player": [], "coach": [], "guardian": []}
            for att in attendance:
                # We'll fetch nicknames in the next iteration or via a mapping
                summary["player"].append(att["user_id"])
            s["attendance_summary"] = summary
            enhanced_schedules.append(s)
            
        return https_fn.Response(json.dumps(enhanced_schedules, ensure_ascii=False), mimetype="application/json")
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
            
            fs.link_member(data["member_id"], data["line_user_id"])
            return https_fn.Response(json.dumps({"status": "success"}), mimetype="application/json")
    except Exception as e:
        return https_fn.Response(json.dumps({"status": "error", "message": str(e)}), status=500, mimetype="application/json")

@https_fn.on_request(
    cors=options.CorsOptions(cors_origins="*", cors_methods=["get"]),
    invoker="public"
)
def get_unique_locations(req: https_fn.Request) -> https_fn.Response:
    try:
        if req.method == "OPTIONS": return https_fn.Response("OK")
        fs = FirestoreService()
        locations = fs.get_unique_locations()
        return https_fn.Response(json.dumps(locations, ensure_ascii=False), mimetype="application/json")
    except Exception as e:
        return https_fn.Response(str(e), status=500)
