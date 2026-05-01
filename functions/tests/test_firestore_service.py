import pytest
from unittest.mock import MagicMock, patch
from services.firestore_service import FirestoreService

def test_update_attendance_success(mocker):
    # Mock firestore client
    mock_db = MagicMock()
    mocker.patch("firebase_admin.firestore.client", return_value=mock_db)
    
    service = FirestoreService()
    result = service.update_attendance("user_123", "sch_456", "attended")
    
    assert result is True
    mock_db.collection.assert_called_with("attendance")
    mock_db.collection().document.assert_called_with("sch_456_user_123")
    mock_db.collection().document().set.assert_called_once()

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
