import json
import logging
import google.generativeai as genai
from typing import Dict, Any, Optional
from config import config
from services.gem_instructions import SCORE_ASSISTANT_GEM

class GeminiService:
    def __init__(self, api_key: Optional[str] = None):
        self.api_key = api_key or config.gemini_api_key
        if self.api_key:
            genai.configure(api_key=self.api_key)
        
        logging.info(f"Initializing GeminiService with model: {config.gemini_model}")
        try:
            self.model = genai.GenerativeModel(config.gemini_model)
        except Exception as e:
            logging.error(f"Failed to initialize GenerativeModel with {config.gemini_model}: {str(e)}")
            self.model = None

    def _proto_to_dict(self, proto_obj):
        """Recursively converts protobuf-like objects (MapComposite, RepeatedComposite) to standard dicts/lists."""
        if hasattr(proto_obj, "items"): # Map-like
            return {k: self._proto_to_dict(v) for k, v in proto_obj.items()}
        elif isinstance(proto_obj, (list, tuple)): # List-like
            return [self._proto_to_dict(v) for v in proto_obj]
        elif hasattr(proto_obj, "__iter__") and not isinstance(proto_obj, str): # RepeatedComposite
            return [self._proto_to_dict(v) for v in proto_obj]
        return proto_obj

    def extract_trial_info(self, email_body: str) -> Dict[str, Any]:
        """
        Extracts trial request information from email body using Gemini.
        Returns a dict with structured data and a persona-based message.
        """
        prompt = f"""
あなたは少年野球チームの事務局AI「スコア・アシスタント」です。
以下のメール本文から、体験希望者の情報を抽出してください。

【メール本文】
{email_body}

【指示】
1. 以下の項目をJSON形式で抽出してください。
   - name: 氏名
   - grade: 学年（数字のみ、例: 3）
   - request_date: 体験希望日（不明な場合は null）
   - contact: 連絡先
   - missing_info: 不足している情報があればそのリスト

2. 抽出した情報を元に、管理者への報告メッセージを作成してください。
   - 性格: 明るく元気な熱血マネージャー
   - 口調: 「〜です！」「〜ですね！」。野球用語（ナイスプレイ、進塁など）を交える。
   - 氏名はプライバシー保護のため、報告メッセージ内では「〇〇君/さん（小X）」のように変換すること。

出力は以下のJSON形式のみとしてください。
{{
  "data": {{
    "name": "...",
    "grade": 0,
    "request_date": "...",
    "contact": "...",
    "missing_info": []
  }},
  "message": "エージェントとしての報告メッセージ"
}}
"""
        response = self.model.generate_content(prompt)
        try:
            # Extract JSON from code blocks if necessary
            text = response.text.strip()
            if text.startswith("```json"):
                text = text.split("```json")[1].split("```")[0].strip()
            elif text.startswith("```"):
                text = text.split("```")[1].split("```")[0].strip()
            
            return json.loads(text)
        except Exception as e:
            logging.error(f"Gemini extraction error: {str(e)}", exc_info=True)
            return {"error": str(e), "message": "解析エラーが発生しました。"}

    def generate_carpool_appeal(self, shortage_count: int, date_str: str) -> str:
        """
        Generates a recruitment message for carpool shortage using Score Assistant persona.
        """
        prompt = f"""
        あなたは「少年野球チームの副事務局長 スコア・アシスタント」です。
        以下の状況に基づいて、チームのLINEグループに流す「配車協力のお願い」を作成してください。

        状況:
        - 日程: {date_str}
        - 不足している座席数: {shortage_count}席

        条件:
        - キャラクター設定（AGENT.md）を守ること。
        - 熱血で前向き、かつ保護者への配慮があること。
        - 3行〜5行程度で。
        """
        try:
            model = genai.GenerativeModel(config.gemini_model)
            response = model.generate_content(prompt)
            return response.text
        except Exception as e:
            logging.error(f"Gemini generation error: {str(e)}", exc_info=True)
            return f"【SOS】{date_str}の配車が{shortage_count}席不足しています！ご協力お願いします！"

    def analyze_schedule_change(self, old_data: Dict[str, Any], new_data: Dict[str, Any]) -> str:
        """
        Analyzes the difference between old and new schedule data and returns a summary.
        """
        prompt = f"""
        野球チームの予定が更新されました。変更前後の内容を比較し、
        保護者や選手が「何が変わったのか」を一目で理解できるようにトピック（時間、場所、持ち物など）を整理して出力してください。
        
        変更前: {json.dumps(old_data, ensure_ascii=False)}
        変更後: {json.dumps(new_data, ensure_ascii=False)}
        
        出力は日本語で、箇条書き形式、3行程度にまとめてください。
        """
        try:
            response = self.model.generate_content(prompt)
            return response.text
        except Exception as e:
            logging.error(f"Gemini analysis error: {str(e)}")
            return "予定が更新されました。詳細は詳細画面を確認してください。"

    def generate_bot_reply(self, user_message: str, context: Optional[str] = None) -> Dict[str, Any]:
        """Generates a friendly bot reply using the SCORE_ASSISTANT_GEM asset."""
        liff_url = "https://liff.line.me/2004699424-QfmD6MxZ"
        
        # Format the Gem with dynamic variables
        system_instruction = SCORE_ASSISTANT_GEM.format(liff_url=liff_url)

        tools = [
            {
                "function_declarations": [
                    {
                        "name": "register_schedule",
                        "description": "新しい予定（練習、試合、遠征、学校行事など）を登録します。",
                        "parameters": {
                            "type": "OBJECT",
                            "properties": {
                                "date": {"type": "STRING", "description": "日付 (YYYY-MM-DD)"},
                                "type": {"type": "STRING", "description": "予定種別 (練習, 試合, 遠征, 学校行事, その他)"},
                                "location": {"type": "STRING", "description": "場所"},
                                "target_categories": {"type": "ARRAY", "items": {"type": "STRING"}, "description": "対象カテゴリ (regular, junior, all)"},
                                "has_lunch": {"type": "BOOLEAN", "description": "弁当が必要かどうか"},
                                "description": {"type": "STRING", "description": "詳細・備考"},
                                "meeting_time": {"type": "STRING", "description": "集合時間 (HH:MM)"},
                                "tournament_name": {"type": "STRING", "description": "大会名 (試合の場合)"}
                            },
                            "required": ["date", "type", "location"]
                        }
                    },
                    {
                        "name": "register_ground_reservation",
                        "description": "球場・グラウンドの確保情報を登録します。チーム全体の予定とは別枠で管理されます。",
                        "parameters": {
                            "type": "OBJECT",
                            "properties": {
                                "date": {"type": "STRING", "description": "日付 (YYYY-MM-DD)"},
                                "stadium_name": {"type": "STRING", "description": "球場名・グラウンド名"},
                                "time_slot": {"type": "STRING", "description": "時間枠 (例: 9:00-13:00)"},
                                "status": {"type": "STRING", "description": "状態 (reserved:確保済, applying:申請中, available:空きあり)"},
                                "notes": {"type": "STRING", "description": "備考"}
                            },
                            "required": ["date", "stadium_name"]
                        }
                    },
                    {
                        "name": "get_member_list",
                        "description": "チームメンバー（指導者、保護者、選手）の一覧と役割を取得します。",
                        "parameters": {
                            "type": "OBJECT",
                            "properties": {
                                "role": {"type": "STRING", "description": "特定の役割で絞り込む場合 (coach, parent, player)"}
                            }
                        }
                    }
                ]
            }
        ]

        try:
            # Initialize model with system_instruction (the "Gem")
            model = genai.GenerativeModel(
                model_name=config.gemini_model,
                tools=tools,
                system_instruction=system_instruction
            )
            
            prompt = f"状況コンテキスト: {context if context else 'なし'}\nユーザーのメッセージ: {user_message}"
            response = model.generate_content(prompt)
            
            response_text = ""
            try: response_text = response.text
            except Exception: pass
            
            result = {"text": response_text, "tool_calls": []}
            if response.candidates and response.candidates[0].content.parts:
                for part in response.candidates[0].content.parts:
                    if part.function_call:
                        result["tool_calls"].append({
                            "name": part.function_call.name,
                            "args": self._proto_to_dict(part.function_call.args)
                        })
            
            return result
        except Exception as e:
            logging.error(f"Gemini reply error: {str(e)}", exc_info=True)
            return {"text": f"すみません内部的にエラーが出ているようです。"}
