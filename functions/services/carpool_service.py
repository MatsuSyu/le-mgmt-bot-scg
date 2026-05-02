import logging
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
        try:
            records = self.firestore.get_schedule_attendance(schedule_id)
            logging.info(f"Calculating carpool for {schedule_id} with {len(records)} records")
            
            want_ride = 0
            seats_available = 0
            
            for r in records:
                user_id = r.get("user_id")
                status = r.get("status")
                car_info = r.get("car_info", {})
                mode = car_info.get("mode")
                
                if status == "出席":
                    if mode == "同乗希望":
                        want_ride += 1
                    elif mode == "車出し可能":
                        # Try to get registered car capacity, fallback to provided or default
                        registered_car = self.firestore.get_car_info(user_id)
                        if registered_car:
                            seats_available += registered_car.get("max_seats", 5) - 1 # -1 for driver
                        else:
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
        except Exception as e:
            logging.error(f"Carpool calculation error for {schedule_id}: {str(e)}", exc_info=True)
            return {"error": str(e), "is_short": False}
