import os
import requests
from typing import Optional

class LineService:
    def __init__(self, channel_access_token: Optional[str] = None):
        self.token = channel_access_token or os.environ.get("LINE_CHANNEL_ACCESS_TOKEN")
        self.api_url = "https://api.line.me/v2/bot/message/push"

    def send_admin_notification(self, message: str, admin_group_id: Optional[str] = None) -> bool:
        """
        Sends a push message to the admin group/user.
        """
        target_id = admin_group_id or os.environ.get("LINE_ADMIN_GROUP_ID")
        if not self.token or not target_id:
            print("LINE_CHANNEL_ACCESS_TOKEN or LINE_ADMIN_GROUP_ID is not set.")
            return False

        headers = {
            "Content-Type": "application/json",
            "Authorization": f"Bearer {self.token}"
        }
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
            response = requests.post(self.api_url, headers=headers, json=payload)
            response.raise_for_status()
            return True
        except Exception as e:
            print(f"Failed to send LINE notification: {str(e)}")
            return False
