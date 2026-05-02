# システム詳細仕様書

## 1. 主要ワークフローの詳細

### WF-01: 体験希望検知フロー (Skill: mail_intelligence)
1. **検知**: Gmail API (Pub/Sub) が新着メールを検知。
2. **解析**: `GeminiService` が本文から「氏名・学年・希望日・連絡先」を構造化データ (JSON) として抽出。
3. **通知**: `LineService` が「スコア・アシスタント」の人格で管理者にPush通知。
4. **監査**: `LogService` がイベントを記録。

### WF-02: 出欠・配車回答フロー (Skill: liff_bridge)
1. **入力**: 保護者が `LIFF App` から「出欠（出席/欠席/遅刻/早退）」と「配車（車出し/同乗/不要）」を選択。
2. **保存**: `FirestoreService` が `{schedule_id}_{user_id}` をキーにデータを保存。
3. **同期**: `SheetsService` が Google Sheets API を叩き、スプレッドシートをリアルタイム更新。
4. **計算**: `CarpoolService` が座席の過不足を計算し、不足時はGeminiが募集文を生成。
5. **通知**: 登録完了と同時に、管理者グループへ状況を通知。

## 2. コンポーネント設計

### バックエンド (functions/)
- **main.py**: エントリポイント（HTTPSリクエスト、LINE/Gmail Webhookの受信）。
- **services/**: 責務ごとに分離されたビジネスロジック。
  - `firestore_service.py`: データ永続化（メンバー、予定、車両情報への対応拡張済み）。
  - `sheets_service.py`: スプレッドシート同期。
  - `line_service.py`: LINE通知送信。
  - `gemini_service.py`: AIによる解析・文章生成。
  - `carpool_service.py`: 配車計算ロジック（登録車両定員を考慮）。
  - `log_service.py`: 操作履歴の記録。

### フロントエンド
- **admin-dashboard/** (管理者用):
  - PC・タブレット向けの全体監視画面。
  - 出欠状況のリアルタイム表示、統計カード、操作ログビューア。
- **liff-app/** (保護者用):
  - スマホ向け軽量回答画面。
  - LINE内ブラウザでの動作に最適化された大きなUIパーツ。

## 3. セキュリティ・保守規程
- **署名検証**: `utils/signature.py` により、LINEからの正規のリクエストであることを保証。
- **環境変数**: APIキーなどの機密情報は `os.environ` で管理。
- **三原則の遵守**:
  - **Security**: 個人情報の最小化とアクセス制御。
  - **Maintainability**: クラスベースの設計と `pytest` による自動テスト。
  - **Performance**: 非同期処理と軽量なフロントエンド資産。

## 4. データ構造 (Firestore)
- **members**: `{line_user_id}`: `{ name, role, categories, linked_players, elementary_school }`
- **schedules**: `{schedule_id}`: `{ date, type, location, target_categories, description }`
- **attendance**: `{schedule_id}_{user_id}`: `{ status, car_info, remarks, updated_at }`
- **cars**: `{user_id}`: `{ owner_name, max_seats, is_available }`
- **logs**: `{ id }`: `{ timestamp, action_type, message, user_id }`
- **messages**: `{ id }`: `{ timestamp, user_id, text, ai_reply }`
