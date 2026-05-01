# Development Rules
- **Architecture- **No-GAS Policy**: Google Apps Scriptでのロジック実装は禁止。全てのスクリプトはFirebase Functions (Python) で実行し、Sheets API経由で操作すること。
- **Error Handling & Logging**: 全ての例外は `try-except` で捕捉し、Cloud Loggingで追跡可能な形でログ出力すること。エラー時は管理者に「エラー報告（野球の比喩：エラー発生！バックアップお願いします！）」を飛ばす。

## 開発の三原則
1. **Security**: LINE署名検証、APIキーの環境変数管理、個人情報の最小化を徹底する。
2. **Maintainability**: クラス・サービス単位での責務分割、型ヒントの活用、`pytest` による網羅的なテストコードを維持する。
3. **Performance**: API呼び出しの最適化、フロントエンドの軽量化（Vite活用）、不要なループの排除を行い、レスポンスの速さを追求する。
- **Security**: 
  - 児童のプライバシー（氏名、住所等）は Gemini へのプロンプト送信前にマスキング、または最小限の情報に絞り込め。
- **Reliability**: 
  - 全ての外部連携（LINE/Gmail/Sheets）には例外処理を実装し、エラー時は管理者に「エラー報告（野球の比喩：エラー発生！バックアップお願いします！）」を飛ばすこと。
- **Testing & Verification Strategy**:
  - 【バックエンド単体テスト】: ロジック実装時は必ず自動テストコード（例: `pytest`等）を作成すること。手持のWeb動作確認に依存してはならない。
  - 【LINE Bot連携モックテスト】: LINE Webhookのペイロード送信やMessaging APIの呼び出しは、実際にLINEを送信する前に `unittest.mock` 等を用いてモック化し、ロジックの正確性を検証すること。
  - 【デグレード検証】: 既存コードの修正・新機能追加時は、必ず既存の単体テストスイートを全件パスさせることを絶対条件とする。
- **Version Control & Deployment**:
  - 【GitHub管理とコミットルール】: ソースコードは必ずGitHubで管理する。コミットメッセージは `Conventional Commits` のルールに従い、`feat:`, `fix:`, `docs:`, `test:`, `refactor:` などのプレフィックスを用いて論理的な単位で記録すること。
  - 【Firebaseデプロイ制約】: Firebase (Functions/Hosting) へのデプロイ（`firebase deploy`）は、Testerエージェントによる**全ての自動テストとデグレード検証がパスした後**でのみ許可される。テスト未通過でのデプロイは固く禁ずる。
- **Development Pipeline**: 
  - 【厳格な制約】いかなる機能の実装時も、直ちにコードを書き始めてはならない。
  - 必ず `DEV_AGENTS.md` に定義されたパイプライン（Planner検討 → Reviewer点検 → Verifier確認 → 実装 → Tester検証 → Deployerリリース）を順に実行し、思考と検証のプロセスを残すこと。
