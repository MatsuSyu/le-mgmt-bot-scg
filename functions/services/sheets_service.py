import logging
import datetime
from googleapiclient.discovery import build
from typing import List, Any, Optional, Dict
from config import config

class SheetsService:
    def __init__(self, spreadsheet_id: Optional[str] = None):
        self.spreadsheet_id = spreadsheet_id or config.google_sheet_id
        self.service = None

    def _get_service(self):
        if not self.service:
            try:
                # In Gen 2 Firebase Functions, build('sheets', 'v4') works if configured
                self.service = build('sheets', 'v4')
            except Exception as e:
                logging.error(f"Failed to initialize Sheets service: {str(e)}", exc_info=True)
                raise
        return self.service

    def update_sheet(self, sheet_name: str, data: List[List[Any]]) -> bool:
        """Updates a specific sheet. Clears content first to ensure fresh data."""
        if not self.spreadsheet_id: return False
        try:
            service = self._get_service()
            # Clear first
            service.spreadsheets().values().clear(
                spreadsheetId=self.spreadsheet_id,
                range=f"'{sheet_name}'!A1:Z1000"
            ).execute()
            
            # Update
            body = {'values': data}
            service.spreadsheets().values().update(
                spreadsheetId=self.spreadsheet_id,
                range=f"'{sheet_name}'!A1",
                valueInputOption='USER_ENTERED',
                body=body
            ).execute()
            return True
        except Exception as e:
            logging.error(f"Sheets update error for {sheet_name}: {str(e)}")
            return False

    def sync_attendance_dashboard(self, schedules: List[Dict], members: List[Dict], all_attendance: Dict[str, List[Dict]]) -> bool:
        """
        Creates a 'Dashboard' sheet with Today's status and a 'Monthly Summary' sheet.
        """
        # 1. Today's Status (Dashboard)
        header = [["状況集計日時", "最終更新: " + str(datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S"))]]
        header.append([])
        header.append(["日付", "種別", "場所", "出席", "欠席", "遅刻/早退", "配車可能車数"])
        
        rows = []
        for s in schedules:
            att = all_attendance.get(s["id"], [])
            present = len([a for a in att if a["status"] == "出席"])
            absent = len([a for a in att if a["status"] == "欠席"])
            others = len([a for a in att if a["status"] in ["遅刻", "早退"]])
            cars = len([a for a in att if a.get("car_info", {}).get("mode") == "車出し可能"])
            
            rows.append([
                s.get("date", "-"), 
                s.get("type", "-"), 
                s.get("location", "-"),
                present, absent, others, cars
            ])
        
        return self.update_sheet("状況ダッシュボード", header + rows)

    def sync_detailed_report(self, schedule: Dict, members: List[Dict], attendance: List[Dict]) -> bool:
        """
        Creates a detailed attendance list for a specific event.
        """
        # Robust date handling for sheet name
        raw_date = schedule.get('date', '0000-00-00')
        date_str = str(raw_date)[:10] if raw_date else "0000-00-00"
        sheet_name = f"詳細_{date_str}"
        
        header = [
            ["イベント名", schedule.get("location", "-")],
            ["日付", raw_date],
            ["集合時間", schedule.get("meeting_time", "-")],
            ["種別", schedule.get("type", "-")],
            [],
            ["名前", "役職/学年", "出欠状況", "配車状況", "伝言"]
        ]
        
        # Create member mapping
        member_map = {m["id"]: m for m in members}
        
        rows = []
        for att in attendance:
            m = member_map.get(att["user_id"], {"name": "不明", "role": "-"})
            rows.append([
                m["name"],
                f"{m.get('role', '-')}/{m.get('grade', '-')}年",
                att.get("status", "-"),
                att.get("car_info", {}).get("mode", "-"),
                att.get("remarks", "")
            ])
            
        return self.update_sheet(sheet_name, header + rows)
