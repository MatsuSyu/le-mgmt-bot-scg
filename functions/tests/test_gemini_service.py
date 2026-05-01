import pytest
from unittest.mock import MagicMock
from services.gemini_service import GeminiService

def test_extract_trial_info_parsing(mocker):
    # Mock Gemini response
    mock_response = MagicMock()
    mock_response.text = '{"data": {"name": "山田太郎", "grade": 3, "request_date": "2024-05-10", "contact": "090-0000-0000", "missing_info": []}, "message": "山田君（小3）が体験に来たいそうです！ナイスプレイ！"}'
    
    mocker.patch("google.generativeai.GenerativeModel.generate_content", return_value=mock_response)
    
    service = GeminiService(api_key="fake_key")
    result = service.extract_trial_info("dummy email body")
    
    assert result["data"]["name"] == "山田太郎"
    assert "山田君（小3）" in result["message"]
    assert "ナイスプレイ" in result["message"]

def test_extract_trial_info_with_json_fence(mocker):
    # Mock Gemini response with code fences
    mock_response = MagicMock()
    mock_response.text = '```json\n{"data": {"name": "田中", "grade": 1}, "message": "テスト"}\n```'
    
    mocker.patch("google.generativeai.GenerativeModel.generate_content", return_value=mock_response)
    
    service = GeminiService(api_key="fake_key")
    result = service.extract_trial_info("dummy")
    
    assert result["data"]["name"] == "田中"
