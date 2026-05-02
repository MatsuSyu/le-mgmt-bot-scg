import logging
import requests
from typing import Optional
from config import config

class LineService:
    def __init__(self):
        self.token = config.line_channel_access_token
        self.admin_group_id = config.line_admin_group_id
        self.api_url_push = "https://api.line.me/v2/bot/message/push"
        self.api_url_reply = "https://api.line.me/v2/bot/message/reply"

    def _get_headers(self):
        return {
            "Content-Type": "application/json",
            "Authorization": f"Bearer {self.token}"
        }

    def send_admin_notification(self, message: str, admin_group_id: Optional[str] = None) -> bool:
        """
        Sends a push message to the admin group/user.
        """
        target_id = admin_group_id or self.admin_group_id
        if not self.token or not target_id:
            logging.error("LINE_CHANNEL_ACCESS_TOKEN or LINE_ADMIN_GROUP_ID is not set.")
            return False

        headers = self._get_headers()
        payload = {
            "to": target_id,
            "messages": [
                {
                    "type": "text",
                    "text": message
                }
            ]
        }

        try:
            response = requests.post(self.api_url_push, headers=headers, json=payload)
            response.raise_for_status()
            return True
        except Exception as e:
            logging.error(f"Failed to send LINE notification: {str(e)}", exc_info=True)
            return False

    def reply_message(self, reply_token: str, message: str) -> bool:
        """
        Replies to a message using the reply token.
        """
        if not self.token:
            return False

        headers = self._get_headers()
        payload = {
            "replyToken": reply_token,
            "messages": [
                {
                    "type": "text",
                    "text": message
                }
            ]
        }

        try:
            response = requests.post(self.api_url_reply, headers=headers, json=payload)
            response.raise_for_status()
            return True
        except Exception as e:
            logging.error(f"Failed to reply LINE message: {str(e)}", exc_info=True)
            return False
