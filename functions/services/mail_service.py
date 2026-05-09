import base64
import logging
import json
from google.oauth2 import service_account, credentials
from googleapiclient.discovery import build
from typing import Optional

class MailService:
    def __init__(self, credentials_json: Optional[str] = None):
        self.credentials_json = credentials_json
        self.service = self._build_service()

    def _build_service(self):
        """Initializes the Gmail API service using provided credentials."""
        try:
            if not self.credentials_json:
                logging.warning("GMAIL_CREDENTIALS_JSON is not set. Gmail features will be unavailable.")
                return None
            
            try:
                info = json.loads(self.credentials_json)
            except json.JSONDecodeError:
                logging.error("GMAIL_CREDENTIALS_JSON is not a valid JSON string.")
                return None

            # Scopes for reading emails
            scopes = ['https://www.googleapis.com/auth/gmail.readonly', 'https://www.googleapis.com/auth/gmail.modify']
            
            if info.get('type') == 'service_account':
                creds = service_account.Credentials.from_service_account_info(info, scopes=scopes)
            elif 'refresh_token' in info:
                creds = credentials.Credentials.from_authorized_user_info(info, scopes=scopes)
            else:
                logging.error("Unknown credential type in GMAIL_CREDENTIALS_JSON.")
                return None
            
            return build('gmail', 'v1', credentials=creds)
        except Exception as e:
            logging.error(f"Failed to build Gmail service: {str(e)}", exc_info=True)
            return None

    def get_message_content(self, message_id: str, user_id: str = 'me') -> str:
        """Fetches and decodes the plain text body of a Gmail message."""
        if not self.service:
            logging.error("Gmail service not initialized.")
            return ""
        
        try:
            message = self.service.users().messages().get(userId=user_id, id=message_id, format='full').execute()
            payload = message.get('payload', {})
            
            # Helper to find text/plain part in recursive parts
            def find_plain_text(parts):
                for part in parts:
                    if part['mimeType'] == 'text/plain':
                        return part.get('body', {}).get('data', '')
                    if 'parts' in part:
                        res = find_plain_text(part['parts'])
                        if res: return res
                return None

            data = ""
            if 'parts' in payload:
                data = find_plain_text(payload['parts'])
            else:
                data = payload.get('body', {}).get('data', '')

            if data:
                return base64.urlsafe_b64decode(data).decode('utf-8')
            
            return ""
        except Exception as e:
            logging.error(f"Failed to get Gmail message {message_id}: {str(e)}", exc_info=True)
            return ""

    def list_messages(self, query: str, user_id: str = 'me', max_results: int = 10):
        """Lists messages matching the given query."""
        if not self.service:
            return []
        try:
            results = self.service.users().messages().list(userId=user_id, q=query, maxResults=max_results).execute()
            return results.get('messages', [])
        except Exception as e:
            logging.error(f"Failed to list Gmail messages: {str(e)}")
            return []

    def mark_as_read(self, message_id: str, user_id: str = 'me'):
        """Removes the UNREAD label from a message."""
        if not self.service:
            return
        try:
            self.service.users().messages().batchModify(
                userId=user_id,
                body={'ids': [message_id], 'removeLabelIds': ['UNREAD']}
            ).execute()
        except Exception as e:
            logging.error(f"Failed to mark message {message_id} as read: {str(e)}")
