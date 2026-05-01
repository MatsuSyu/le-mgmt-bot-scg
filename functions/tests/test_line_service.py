import pytest
from services.line_service import LineService

def test_send_admin_notification_success(mocker):
    mock_post = mocker.patch("requests.post")
    mock_post.return_value.status_code = 200
    
    service = LineService(channel_access_token="fake_token")
    os_environ_patch = mocker.patch.dict("os.environ", {"LINE_ADMIN_GROUP_ID": "group_123"})
    
    result = service.send_admin_notification("Hello!")
    
    assert result is True
    mock_post.assert_called_once()
    args, kwargs = mock_post.call_args
    assert kwargs["json"]["to"] == "group_123"
    assert kwargs["json"]["messages"][0]["text"] == "Hello!"

def test_send_admin_notification_failure(mocker):
    mock_post = mocker.patch("requests.post")
    mock_post.return_value.raise_for_status.side_effect = Exception("API Error")
    
    service = LineService(channel_access_token="fake_token")
    mocker.patch.dict("os.environ", {"LINE_ADMIN_GROUP_ID": "group_123"})
    
    result = service.send_admin_notification("Hello!")
    
    assert result is False
