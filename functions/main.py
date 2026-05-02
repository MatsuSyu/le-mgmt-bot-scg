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

initialize_app()

@https_fn.on_request(secrets=[LINE_CHANNEL_SECRET_KEY, LINE_CHANNEL_ACCESS_TOKEN_KEY])
def line_webhook(req: https_fn.Request) -> https_fn.Response:
    """
    Handles LINE Messaging API Webhook.
    Includes signature verification.
    """
    signature = req.headers.get("x-line-signature", "")
    body = req.get_data(as_text=True)

    # 1. Verify Signature
    if not verify_line_signature(body, signature):
        return https_fn.Response("Invalid signature", status=401)

    # 2. Process Events
    try:
        events = req.get_json().get("events", [])
        line = LineService()
        
        for event in events:
            if event["type"] == "message" and event["message"]["type"] == "text":
                reply_token = event["replyToken"]
                user_message = event["message"]["text"]
                
                # Simple logic for now: Echo back with persona
                response_text = f"『{user_message}』ですね！了解しました！ナイスプレイ！"
                line.reply_message(reply_token, response_text)

        return https_fn.Response("OK")
    except Exception as e:
        logging.error(f"LINE Webhook error: {str(e)}", exc_info=True)
        return https_fn.Response("Internal Error", status=500)

@https_fn.on_request(secrets=[LINE_CHANNEL_ACCESS_TOKEN_KEY])
def submit_attendance(req: https_fn.Request) -> https_fn.Response:
    try:
        data = req.get_json()
        logging.info(f"Received attendance submission: {json.dumps(data)}")
        
        user_id = data.get("user_id")
        schedule_id = data.get("schedule_id")
        status = data.get("status")
        car_info = data.get("car_info")
        remarks = data.get("remarks", "")
        
        log_service = LogService()
        firestore_service = FirestoreService()
        firestore_service.update_attendance(user_id, schedule_id, status, car_info, remarks)
        
        # Syncing to sheet (using default sheet name for now)
        sheets_service = SheetsService()
        # sheets_service.sync_attendance_to_sheet("Attendance", [...]) # Needs logic to format all attendance data
        
        line_service = LineService()
        line_service.send_admin_notification(f"【出欠連絡】{user_id}さんが{status}（配車：{car_info.get('mode')}）を登録しました！ナイスプレー！\n備考：{remarks}")
        
        log_service.record_action("ATTENDANCE_SUBMIT", f"{user_id} submitted {status} for {schedule_id}", user_id)
        
        return https_fn.Response(json.dumps({"status": "success"}), mimetype="application/json")
    except Exception as e:
        logging.error(f"Submission error: {str(e)}", exc_info=True)
        LogService().record_error(f"Attendance submission failed: {str(e)}")
        return https_fn.Response(json.dumps({"status": "error", "message": str(e)}), status=500, mimetype="application/json")

@https_fn.on_request(secrets=[GEMINI_API_KEY_KEY, LINE_CHANNEL_ACCESS_TOKEN_KEY])
def handle_gmail_webhook(req: https_fn.Request) -> https_fn.Response:
    """
    Handles Gmail Pub/Sub webhook.
    """
    try:
        data = req.get_json()
        email_body = data.get("email_body", "")
        if not email_body: return https_fn.Response("No body", status=400)

        gemini = GeminiService()
        result = gemini.extract_trial_info(email_body)
        
        line = LineService()
        line.send_admin_notification(result.get("message", "体験希望通知"))

        return https_fn.Response("OK")
    except Exception as e:
        return https_fn.Response(str(e), status=500)
