import pytest
import os
from unittest.mock import MagicMock, patch

# Set environment variables for tests
os.environ["LINE_CHANNEL_SECRET"] = "fake_secret"
os.environ["LINE_CHANNEL_ACCESS_TOKEN"] = "fake_token"
os.environ["LINE_ADMIN_GROUP_ID"] = "fake_group"

# Mock firebase_admin BEFORE any other imports
with patch("firebase_admin.initialize_app"), \
     patch("firebase_admin.firestore.client"), \
     patch("firebase_admin.credentials.Certificate"):
    from main import line_webhook, submit_attendance

def test_line_webhook_invalid_signature(mocker):
    mocker.patch("main.verify_line_signature", return_value=False)
    req = MagicMock()
    req.headers = {"x-line-signature": "invalid"}
    req.get_data.return_value = "body"
    resp = line_webhook(req)
    assert resp.status_code == 401

def test_line_webhook_success(mocker):
    mocker.patch("main.verify_line_signature", return_value=True)
    mock_line_cls = mocker.patch("main.LineService")
    mock_line_instance = mock_line_cls.return_value
    
    req = MagicMock()
    req.headers = {"x-line-signature": "valid"}
    req.get_data.return_value = '{"events": [{"type": "message", "replyToken": "token123", "message": {"type": "text", "text": "hello"}}]}'
    req.get_json.return_value = {"events": [{"type": "message", "replyToken": "token123", "message": {"type": "text", "text": "hello"}}]}
    
    resp = line_webhook(req)
    assert resp.status_code == 200
    mock_line_instance.reply_message.assert_called_once()

def test_submit_attendance_success(mocker):
    # Mock all services in main
    mocker.patch("main.FirestoreService")
    mocker.patch("main.SheetsService")
    mocker.patch("main.LineService")
    
    req = MagicMock()
    req.get_json.return_value = {
        "user_id": "user1",
        "schedule_id": "sch1",
        "status": "出席"
    }
    
    resp = submit_attendance(req)
    assert resp.status_code == 200
    assert "true" in resp.response[0].decode("utf-8").lower()
