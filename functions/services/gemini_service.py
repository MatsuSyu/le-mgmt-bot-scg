import json
import logging
import google.generativeai as genai
from typing import Dict, Any, Optional
from config import config

class GeminiService:
    def __init__(self, api_key: Optional[str] = None):
        self.api_key = api_key or config.gemini_api_key
        if self.api_key:
            genai.configure(api_key=self.api_key)
        self.model = genai.GenerativeModel('gemini-1.5-flash-latest')

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
        - 「ナイス連携」「プレイボール」などの野球用語を適度に入れること。
        - 3行〜5行程度で。
        """
        try:
            model = genai.GenerativeModel('gemini-1.5-flash')
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

    def generate_bot_reply(self, user_message: str, context: Optional[str] = None) -> str:
        """
        Generates a friendly bot reply based on user message and optional context.
        """
        prompt = f"""
        あなたは少年野球チーム「Little Eagles」の熱血応援管理ボット「スコア・アシスタント」です。
        語尾に「！」「ナイスプレイ！」などをつけ、ポジティブで明るい口調で答えてください。
        
        ユーザーのメッセージ: {user_message}
        状況コンテキスト: {context if context else '通常の会話'}
        
        100文字以内で、親しみやすい返信を生成してください。野球用語を適度に交えてください。
        """
        try:
            response = self.model.generate_content(prompt)
            return response.text
        except Exception as e:
            logging.error(f"Gemini reply error: {str(e)}")
            return f"『{user_message}』ですね！了解しました！ナイスプレイ！"
