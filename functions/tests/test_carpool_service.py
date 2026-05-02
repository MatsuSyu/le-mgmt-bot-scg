import pytest
from unittest.mock import MagicMock

from services.carpool_service import CarpoolService

def test_calculate_carpool_shortage(mocker):
    # Mock services used inside CarpoolService
    mock_firestore_cls = mocker.patch("services.carpool_service.FirestoreService")
    mock_gemini_cls = mocker.patch("services.carpool_service.GeminiService")
    
    mock_firestore = mock_firestore_cls.return_value
    mock_gemini = mock_gemini_cls.return_value

    # Mock data
    mock_firestore.get_schedule_attendance.return_value = [
        {"user_id": "u1", "status": "出席", "car_info": {"mode": "同乗希望"}},
        {"user_id": "u2", "status": "出席", "car_info": {"mode": "同乗希望"}},
        {"user_id": "u3", "status": "出席", "car_info": {"mode": "車出し可能"}},
    ]
    # u3 provides 1 seat (max_seats 2 - 1 for driver)
    mock_firestore.get_car_info.side_effect = lambda uid: {"max_seats": 2} if uid == "u3" else None
    
    mock_gemini.generate_carpool_appeal.return_value = "Appeal!"

    service = CarpoolService()
    result = service.calculate_carpool_status("sch_1")
    
    # 2 want ride, 1 seat available -> shortage 1
    assert result["is_short"] is True
    assert result["shortage"] == 1
    assert result["appeal_message"] == "Appeal!"

def test_calculate_carpool_no_shortage(mocker):
    mock_firestore_cls = mocker.patch("services.carpool_service.FirestoreService")
    mocker.patch("services.carpool_service.GeminiService")
    
    mock_firestore = mock_firestore_cls.return_value
    mock_firestore.get_schedule_attendance.return_value = [
        {"user_id": "u1", "status": "出席", "car_info": {"mode": "同乗希望"}},
        {"user_id": "u2", "status": "出席", "car_info": {"mode": "車出し可能"}}
    ]
    # u2 provides 4 seats (max_seats 5 - 1 for driver)
    mock_firestore.get_car_info.return_value = {"max_seats": 5}

    service = CarpoolService()
    result = service.calculate_carpool_status("sch_2")
    
    assert result["is_short"] is False
    assert result["shortage"] == 0
