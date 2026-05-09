import pytest
import json
from unittest.mock import MagicMock, patch

# Mock firebase_admin before importing main
with patch('firebase_admin.initialize_app'):
    from main import _check_gmail_trial_requests_logic

@patch('main.MailService')
@patch('main.GeminiService')
@patch('main.LineService')
@patch('main.LogService')
@patch('main.config')
def test_check_gmail_trial_requests_success(mock_config, mock_log, mock_line, mock_gemini, mock_mail):
    # Setup Config mock
    mock_config.gmail_credentials_json = '{"fake": "creds"}'
    mock_config.mailing_list_email = 'littleeagles1976@googlegroups.com'
    
    # Setup MailService mock
    mock_mail_instance = mock_mail.return_value
    mock_mail_instance.service = True
    mock_mail_instance.list_messages.return_value = [{"id": "msg123"}]
    mock_mail_instance.get_message_content.return_value = "田中です。体験希望です。"
    
    # Setup GeminiService mock
    mock_gemini_instance = mock_gemini.return_value
    mock_gemini_instance.extract_trial_info.return_value = {
        "data": {"name": "田中", "grade": 3},
        "message": "田中君（小3）から体験希望です！"
    }
    
    # Execute the logic directly (no scheduler wrapper)
    _check_gmail_trial_requests_logic()
    
    # Assert
    mock_mail_instance.list_messages.assert_called_with(
        query="is:unread to:littleeagles1976@googlegroups.com", 
        max_results=10
    )
    mock_mail_instance.get_message_content.assert_called_with("msg123")
    mock_line.return_value.send_admin_notification.assert_called_with("田中君（小3）から体験希望です！")
    mock_mail_instance.mark_as_read.assert_called_with("msg123")
    mock_log.return_value.record_action.assert_called()

@patch('main.MailService')
def test_check_gmail_no_messages(mock_mail):
    mock_mail_instance = mock_mail.return_value
    mock_mail_instance.service = True
    mock_mail_instance.list_messages.return_value = []
    
    _check_gmail_trial_requests_logic()
    
    mock_mail_instance.list_messages.assert_called()
    mock_mail_instance.get_message_content.assert_not_called()
