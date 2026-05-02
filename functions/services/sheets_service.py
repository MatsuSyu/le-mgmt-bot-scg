import logging
from googleapiclient.discovery import build
from google.oauth2 import service_account
from typing import List, Any, Optional
from config import config

class SheetsService:
    def __init__(self, spreadsheet_id: Optional[str] = None):
        self.spreadsheet_id = spreadsheet_id or config.google_sheet_id
        self.scopes = ['https://www.googleapis.com/auth/spreadsheets']
        self.service = None

    def _get_service(self):
        if not self.service:
            try:
                # Attempt to use default credentials (works on Firebase if set up)
                self.service = build('sheets', 'v4')
            except Exception as e:
                logging.error(f"Failed to initialize Sheets service: {str(e)}", exc_info=True)
                raise
        return self.service

    def sync_attendance_to_sheet(self, sheet_name: str, data: List[List[Any]]) -> bool:
        """
        Overwrites or updates a specific sheet with attendance data.
        """
        if not self.spreadsheet_id:
            logging.error("GOOGLE_SHEET_ID is not set.")
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
            logging.error(f"Sheets sync error: {str(e)}", exc_info=True)
            return False
