import pytest
from unittest.mock import MagicMock
from services.firestore_service import FirestoreService

def test_update_attendance_success(mocker):
    # Mock firestore client and avoid initialize_app requirement
    mock_db = MagicMock()
    mocker.patch("firebase_admin.firestore.client", return_value=mock_db)
    
    service = FirestoreService()
    car_info = {"mode": "driver", "car_id": "car_1"}
    result = service.update_attendance("user_123", "sch_456", "attended", car_info)
    
    assert result is True
    mock_db.collection.assert_called_with("attendance")
    # New ID format is sch_user
    mock_db.collection().document.assert_called_with("sch_456_user_123")

def test_get_schedule_attendance(mocker):
    mock_db = MagicMock()
    mocker.patch("firebase_admin.firestore.client", return_value=mock_db)
    
    mock_doc = MagicMock()
    mock_doc.to_dict.return_value = {"user_id": "u1", "status": "ok"}
    mock_db.collection().where().stream.return_value = [mock_doc]
    
    service = FirestoreService()
    results = service.get_schedule_attendance("sch_1")
    
    assert len(results) == 1
    assert results[0]["user_id"] == "u1"
