# Agent Skills
- **Skill [mail_intelligence]**: Gmail API経由で新着メールをスキャン。Geminiを使用して体験希望者の属性を抽出し、LINE通知プロンプトを生成する能力。
- **Skill [sheet_sync]**: Firestoreの更新を検知し、Google Sheets APIを使用して、出欠・配車表をリアルタイムで同期・整形する能力。
- **Skill [liff_bridge]**: LIFFからのリクエストを解釈し、ユーザーごとの出欠ステータスを即座に更新するバックエンド処理能力。
- **Skill [carpool_solver]**: 配車希望者と定員を計算し、不足がある場合に自動で募集文案を生成する能力。
- **Skill [admin_dashboard]**: React/Viteを用いてFirebase Hosting上に管理者用Webアプリを構築し、Firestoreの全データ（出欠・配車・体験希望）の閲覧および手動編集・修正を可能にする能力。
