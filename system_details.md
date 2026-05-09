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
  - **Home**: 出欠状況のリアルタイム表示（日本語化済み）、統計カード、操作ログビューア。
  - **Members**: 選手・指導者・保護者の名簿管理。役割「指導者 兼 保護者」に対応し、学校名/略称、緊急連絡先、アレルギー情報を保持。複数人の一括登録（バルクインサート）に対応。
  - **Schedule**: 予定の登録・編集。AIによる変更要約コメントの自動付与および管理者による詳細備考（自由入力）に対応。
  - **Grounds**: 球場の確保状況管理。日付、場所、時間枠、予約ステータス（申請中/確保済）を管理。
  - **Cars**: 車両マスター管理。車種、色、定員（運転手含）、基本提供設定を管理。

- **liff-app/** (保護者用):
  - スマホ向け軽量回答画面。
  - **Step 1 (連携/選択)**: 名簿とのLINE連携および回答対象メンバーの選択（兄弟・親子対応）。連携解除機能もここに含まれる。
  - **Step 2 (予定一覧)**: 回答が必要なチーム予定と参照用の学校行事をリスト形式（カード）で表示。回答済み状況や出席人数も確認可能。
  - **Step 3 (回答入力)**: 選択した予定に対するコンディション（出席/欠席/遅刻/早退）および配車（車出し/同乗/不要）の選択。

## 3. セキュリティ・保守規程
- **署名検証**: `utils/signature.py` により、LINEからの正規のリクエストであることを保証。
- **整合性管理**: `Integrity Agent` によるデータ型および通信プロトコルの監視。
- **ドキュメント維持**: `Librarian Agent` による「実装・検証即ドキュメント更新」の徹底（Document-First原則）。
- **三原則の遵守**:
  - **Security**: 個人情報の最小化とアクセス制御。
  - **Maintainability**: クラスベースの設計と `pytest` による自動テスト。
  - **Performance**: 非同期処理と軽量なフロントエンド資産。

## 4. データ構造 (Firestore)
- **members**: `{line_user_id}`: `{ name, role, number, nickname, grade, school_name, short_name, emergency_contact, allergies, notes }`
- **schedules**: `{schedule_id}`: `{ date, type, location, location_from, location_to, tournament_name, opponent, target_categories, description, ai_change_comment }`
- **attendance**: `{schedule_id}_{user_id}`: `{ status, car_info: { mode }, remarks, updated_at }`
- **cars**: `{id}`: `{ owner_name, max_seats, car_model, car_color, notes, is_available }`
- **stadium_reservations**: `{id}`: `{ date, stadium_name, time_slot, status, notes, created_at }`
- **logs**: `{ id }`: `{ timestamp, action_type, message, user_id, user_input, bot_response, group_id, source_type }`
