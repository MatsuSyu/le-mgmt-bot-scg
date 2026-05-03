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
            return [self._format_doc(doc.to_dict()) for doc in docs]
        except Exception as e:
            logging.error(f"Firestore query error: {str(e)}", exc_info=True)
            return []

    # --- Members Management ---
    def get_member(self, user_id: str) -> Optional[Dict[str, Any]]:
        try:
            doc = self.db.collection("members").document(user_id).get()
            return doc.to_dict() if doc.exists else None
        except Exception as e:
            logging.error(f"Error fetching member {user_id}: {str(e)}", exc_info=True)
            return None

    def update_member(self, user_id: str, data: Dict[str, Any]) -> bool:
        try:
            self.db.collection("members").document(user_id).set(data, merge=True)
            return True
        except Exception as e:
            logging.error(f"Error updating member {user_id}: {str(e)}", exc_info=True)
            return False

    # --- Schedules Management ---
    def get_schedule(self, schedule_id: str) -> Optional[Dict[str, Any]]:
        try:
            doc = self.db.collection("schedules").document(schedule_id).get()
            if doc.exists:
                data = self._format_doc(doc.to_dict())
                return {"id": doc.id, **data}
            return None
        except Exception as e:
            logging.error(f"Error fetching schedule {schedule_id}: {str(e)}", exc_info=True)
            return None

    def _format_doc(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """Recursive helper to convert Timestamps to strings for JSON serialization."""
        for key, value in data.items():
            if hasattr(value, "strftime"): # Timestamp
                data[key] = value.strftime("%Y-%m-%d %H:%M:%S")
            elif isinstance(value, dict):
                data[key] = self._format_doc(value)
        return data

    def get_active_schedules(self, limit: int = 5) -> List[Dict[str, Any]]:
        """
        Fetches upcoming or active schedules.
        """
        try:
            docs = self.db.collection("schedules").order_by("date", direction=firestore.Query.DESCENDING).limit(limit).stream()
            schedules = []
            for doc in docs:
                data = self._format_doc(doc.to_dict())
                schedules.append({"id": doc.id, **data})
            return schedules
        except Exception as e:
            logging.error(f"Error fetching active schedules: {str(e)}", exc_info=True)
            return []

    # --- Member Management ---
    def update_member(self, member_id: str, data: Dict[str, Any]):
        try:
            self.db.collection("members").document(member_id).set(data, merge=True)
        except Exception as e:
            logging.error(f"Error updating member {member_id}: {str(e)}", exc_info=True)

    def get_unlinked_members(self) -> List[Dict[str, Any]]:
        try:
            docs = self.db.collection("members").where("line_user_id", "==", None).stream()
            return [{"id": doc.id, **self._format_doc(doc.to_dict())} for doc in docs]
        except Exception as e:
            logging.error(f"Error fetching unlinked members: {str(e)}", exc_info=True)
            return []

    def link_member(self, member_id: str, line_user_id: str):
        try:
            self.db.collection("members").document(member_id).update({"line_user_id": line_user_id})
        except Exception as e:
            logging.error(f"Error linking member {member_id}: {str(e)}", exc_info=True)

    def get_members_by_line_id(self, line_user_id: str) -> List[Dict[str, Any]]:
        try:
            docs = self.db.collection("members").where("line_user_id", "==", line_user_id).stream()
            return [{"id": doc.id, **self._format_doc(doc.to_dict())} for doc in docs]
        except Exception as e:
            logging.error(f"Error fetching members by line_id: {str(e)}", exc_info=True)
            return []

    # --- Schedule History & AI ---
    def update_schedule_with_history(self, schedule_id: Optional[str], new_data: Dict[str, Any], change_summary: str = ""):
        try:
            # Handle date conversion if it's a string
            if "date" in new_data and isinstance(new_data["date"], str):
                try:
                    # Support both YYYY-MM-DD and potentially other formats
                    if len(new_data["date"]) == 10:
                        new_data["date"] = datetime.strptime(new_data["date"], "%Y-%m-%d")
                    else:
                        new_data["date"] = datetime.fromisoformat(new_data["date"].replace("Z", "+00:00"))
                except Exception as e:
                    logging.warning(f"Failed to convert date string '{new_data['date']}': {e}")

            if schedule_id:
                doc_ref = self.db.collection("schedules").document(schedule_id)
                old_doc = doc_ref.get()
                old_data = old_doc.to_dict() if old_doc.exists else {}
                doc_ref.set(new_data, merge=True)
            else:
                # Create new schedule if id is None or empty
                doc_ref = self.db.collection("schedules").document()
                schedule_id = doc_ref.id
                old_data = {}
                doc_ref.set(new_data)

            # Record history
            self.db.collection("schedule_history").add({
                "schedule_id": schedule_id,
                "changed_at": firestore.SERVER_TIMESTAMP,
                "before_data": old_data,
                "after_data": new_data,
                "change_summary": change_summary
            })
            return old_data, schedule_id
        except Exception as e:
            logging.error(f"Error updating schedule with history: {str(e)}", exc_info=True)
            return None, None

    def get_unique_locations(self) -> List[str]:
        try:
            # Simple approach: fetch all schedules and unique locations
            docs = self.db.collection("schedules").stream()
            locations = set()
            for doc in docs:
                data = doc.to_dict()
                if data.get("location"): locations.add(data["location"])
                if data.get("location_from"): locations.add(data["location_from"])
                if data.get("location_to"): locations.add(data["location_to"])
            return sorted(list(locations))
        except Exception as e:
            logging.error(f"Error getting unique locations: {str(e)}", exc_info=True)
            return []
    def get_all_members(self) -> List[Dict[str, Any]]:
        try:
            docs = self.db.collection("members").stream()
            return [{"id": doc.id, **self._format_doc(doc.to_dict())} for doc in docs]
        except Exception as e:
            logging.error(f"Error fetching all members: {str(e)}", exc_info=True)
            return []
