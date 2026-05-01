import os
import logging
from googleapiclient.discovery import build
from google.oauth2 import service_account
from typing import List, Any, Optional

class SheetsService:
    def __init__(self, spreadsheet_id: Optional[str] = None):
        self.spreadsheet_id = spreadsheet_id or os.environ.get("GOOGLE_SHEET_ID")
        self.scopes = ['https://www.googleapis.com/auth/spreadsheets']
        # In Firebase Functions, we can usually use the default credentials or a key file
        # For simplicity in this skeleton, we assume the environment is authorized
        self.service = None

    def _get_service(self):
        if not self.service:
            # Note: In production, you would use service_account.Credentials.from_service_account_info(...)
            # or let the environment handle it if authorized.
            self.service = build('sheets', 'v4')
        return self.service

    def sync_attendance_to_sheet(self, sheet_name: str, data: List[List[Any]]) -> bool:
        """
        Overwrites or updates a specific sheet with attendance data.
        """
        if not self.spreadsheet_id:
            print("GOOGLE_SHEET_ID is not set.")
            return False

        try:
            service = self._get_service()
            range_name = f"{sheet_name}!A1"
            body = {
                'values': data
            }
            service.spreadsheets().values().update(
                spreadsheetId=self.spreadsheet_id,
                range=range_name,
                valueInputOption='USER_ENTERED',
                body=body
            ).execute()
            return True
        except Exception as e:
            print(f"Sheets sync error: {str(e)}")
            return False
