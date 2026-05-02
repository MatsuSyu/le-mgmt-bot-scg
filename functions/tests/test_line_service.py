import pytest
import os
from services.line_service import LineService

def test_send_admin_notification_success(mocker):
    mock_post = mocker.patch("requests.post")
    mock_post.return_value.status_code = 200
    
    mocker.patch.dict("os.environ", {
        "LINE_CHANNEL_ACCESS_TOKEN": "fake_token",
        "LINE_ADMIN_GROUP_ID": "group_123"
    })
    
    service = LineService()
    result = service.send_admin_notification("Hello!")
    
    assert result is True
    mock_post.assert_called_once()
    args, kwargs = mock_post.call_args
    assert kwargs["json"]["to"] == "group_123"
    assert kwargs["json"]["messages"][0]["text"] == "Hello!"

def test_send_admin_notification_failure(mocker):
    mock_post = mocker.patch("requests.post")
    mock_post.return_value.raise_for_status.side_effect = Exception("API Error")
    
    mocker.patch.dict("os.environ", {
        "LINE_CHANNEL_ACCESS_TOKEN": "fake_token",
        "LINE_ADMIN_GROUP_ID": "group_123"
    })
    
    service = LineService()
    result = service.send_admin_notification("Hello!")
    
    assert result is False
