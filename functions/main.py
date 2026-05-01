import os
from firebase_functions import https_fn
from firebase_admin import initialize_app
from services.gemini_service import GeminiService
from services.line_service import LineService

initialize_app()

@https_fn.on_request()
def handle_gmail_webhook(req: https_fn.Request) -> https_fn.Response:
    """
    Handles Gmail Pub/Sub webhook.
    Extracts info with Gemini and notifies LINE.
    """
    # For Pub/Sub, the data is in req.json['message']['data'] (base64 encoded)
    # For now, let's assume a JSON payload for testing or simple HTTP trigger
    try:
        data = req.get_json()
        email_body = data.get("email_body", "")
        
        if not email_body:
            return https_fn.Response("No email body found.", status=400)

        # 1. Extract info with Gemini
        gemini = GeminiService()
        result = gemini.extract_trial_info(email_body)
        
        if "error" in result:
            return https_fn.Response(f"Gemini Error: {result['error']}", status=500)

        # 2. Notify LINE
        line = LineService()
        message = result.get("message", "体験希望の通知です！")
        success = line.send_admin_notification(message)
        
        if success:
            return https_fn.Response("Notification sent successfully!")
        else:
            return https_fn.Response("Failed to send LINE notification.", status=500)

    except Exception as e:
        return https_fn.Response(f"Internal Error: {str(e)}", status=500)
