import os
import json
from firebase_functions import https_fn
from firebase_admin import initialize_app
from services.gemini_service import GeminiService
from services.line_service import LineService
from services.firestore_service import FirestoreService
from services.sheets_service import SheetsService
from utils.signature import verify_line_signature

initialize_app()

@https_fn.on_request()
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
                # (Later we can add Gemini to make it more natural)
                response_text = f"『{user_message}』ですね！了解しました！ナイスプレイ！"
                line.reply_message(reply_token, response_text)

        return https_fn.Response("OK")
    except Exception as e:
        print(f"Webhook error: {str(e)}")
        return https_fn.Response("Internal Error", status=500)

@https_fn.on_request()
def submit_attendance(req: https_fn.Request) -> https_fn.Response:
    """
    Handles attendance submission from LIFF.
    Flow: Firestore -> Sheets -> LINE Notification.
    """
    try:
        data = req.get_json()
        user_id = data.get("user_id")
        schedule_id = data.get("schedule_id")
        status = data.get("status")
        car_info = data.get("car_info")

        if not all([user_id, schedule_id, status]):
            return https_fn.Response("Missing fields", status=400)

        # 1. Save to Firestore
        firestore = FirestoreService()
        if not firestore.update_attendance(user_id, schedule_id, status, car_info):
            return https_fn.Response("Firestore update failed", status=500)

        # 2. Sync to Google Sheets (Simple sync for now)
        # In real case, we might fetch all attendance and overwrite
        sheets = SheetsService()
        # placeholder for data list
        all_data = [["User ID", "Status", "Car"]] + [[user_id, status, str(car_info)]]
        sheets.sync_attendance_to_sheet("Attendance", all_data)

        # 3. Notify LINE (Success message)
        line = LineService()
        line.send_admin_notification(f"【出欠】{user_id}さんが『{status}』で登録しました！")

        return https_fn.Response(json.dumps({"success": True}), content_type="application/json")

    except Exception as e:
        print(f"Submission error: {str(e)}")
        return https_fn.Response("Internal Error", status=500)

@https_fn.on_request()
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
