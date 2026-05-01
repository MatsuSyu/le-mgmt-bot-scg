import logging
from firebase_admin import firestore
from google.cloud.firestore import Client
from typing import Dict, Any, Optional, List
from datetime import datetime

class FirestoreService:
    def __init__(self):
        try:
            self.db: Client = firestore.client()
        except Exception as e:
            logging.error(f"Firestore initialization error: {str(e)}", exc_info=True)
            raise

    def update_attendance(self, user_id: str, schedule_id: str, status: str, car_info: Dict[str, Any], remarks: str = "") -> bool:
        """
        Updates attendance and carpool status in Firestore.
        """
        try:
            doc_id = f"{schedule_id}_{user_id}"
            doc_ref = self.db.collection("attendance").document(doc_id)
            doc_ref.set({
                "user_id": user_id,
                "schedule_id": schedule_id,
                "status": status,
                "car_info": car_info,
                "remarks": remarks,
                "updated_at": firestore.SERVER_TIMESTAMP
            }, merge=True)
            logging.info(f"Successfully updated attendance for {user_id} on {schedule_id}")
            return True
        except Exception as e:
            logging.error(f"Firestore update error for {user_id}: {str(e)}", exc_info=True)
            return False

    def get_schedule_attendance(self, schedule_id: str) -> list:
        """
        Retrieves all attendance records for a specific schedule.
        """
        try:
            docs = self.db.collection("attendance").where("schedule_id", "==", schedule_id).stream()
            return [doc.to_dict() for doc in docs]
        except Exception as e:
            print(f"Firestore query error: {str(e)}")
            return []
