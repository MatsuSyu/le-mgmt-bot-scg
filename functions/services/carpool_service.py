from services.firestore_service import FirestoreService
from services.gemini_service import GeminiService
from typing import Dict, Any

class CarpoolService:
    def __init__(self):
        self.firestore = FirestoreService()
        self.gemini = GeminiService()

    def calculate_carpool_status(self, schedule_id: str) -> Dict[str, Any]:
        """
        Calculates carpool balance and generates an appeal if necessary.
        """
        records = self.firestore.get_schedule_attendance(schedule_id)
        
        want_ride = 0
        seats_available = 0
        
        for r in records:
            status = r.get("status")
            car_info = r.get("car_info", {})
            mode = car_info.get("mode")
            
            if status == "出席":
                if mode == "同乗希望":
                    want_ride += 1
                elif mode == "車出し可能":
                    # Assume average 3 extra seats if not specified
                    seats_available += car_info.get("seats", 3)

        shortage = want_ride - seats_available
        
        result = {
            "schedule_id": schedule_id,
            "want_ride": want_ride,
            "seats_available": seats_available,
            "shortage": max(0, shortage),
            "is_short": shortage > 0
        }

        if shortage > 0:
            result["appeal_message"] = self.gemini.generate_carpool_appeal(shortage, schedule_id)
        
        return result
