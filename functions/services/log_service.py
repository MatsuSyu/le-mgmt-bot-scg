import logging
from datetime import datetime
from services.firestore_service import FirestoreService
from typing import Optional

class LogService:
    def __init__(self):
        self.firestore = FirestoreService()

    def record_action(self, action_type: str, message: str, user_id: Optional[str] = None):
        """
        Records a specific operation or event to Firestore for admin review.
        """
        try:
            log_data = {
                "timestamp": datetime.utcnow(),
                "action_type": action_type,
                "message": message,
                "user_id": user_id or "system",
            }
            # Directly use firestore client to save to 'logs' collection
            self.firestore.db.collection("logs").add(log_data)
            logging.info(f"Operation recorded: {action_type} - {message}")
        except Exception as e:
            logging.error(f"Failed to record action log: {str(e)}", exc_info=True)

    def record_error(self, message: str, user_id: Optional[str] = None):
        self.record_action("ERROR", message, user_id)
