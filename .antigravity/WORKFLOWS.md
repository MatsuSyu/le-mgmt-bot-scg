# Automated Workflows
- **WF-01: 体験希望検知フロー**
  1. [Trigger] Gmail新着（Webhook/PubSub）
  2. [Action] Geminiによる要約 & 抽出
  3. [Action] LINE管理者グループへ「受付通知」送信
- **WF-02: 出欠・配車更新フロー**
  1. [Trigger] LIFFでのボタン送信
  2. [Action] Firestoreへデータ書き込み
  3. [Action] Google Sheetsへ行追加/更新
  4. [Action] 本人へ「受理完了！」のLINE返信

- **WF-03: 管理者ダッシュボード操作フロー**
  1. [Trigger] 管理者がWeb画面（Firebase Hosting上のReactアプリ）へアクセス
  2. [Action] Firestoreから出欠・配車・体験希望の全データを取得・一覧表示
  3. [Action] 管理者によるデータの手動編集・上書き
  4. [Action] 更新結果をFirestoreへ保存（必要に応じ `sheet_sync` でスプレッドシートへ再同期）

- **WF-DEV: 開発・ビルド・デプロイフロー（AIエディタ遵守事項）**
  1. [Action] ローカルでのコーディング実装完了
  2. [Check] Testerエージェントによる自動テスト（`pytest`等）の全件実行・パス確認
  3. [Action] DeployerエージェントによるGitコミット & GitHubへの `push`
  4. [Action] Deployerエージェントによるビルドの実行（`npm run build`等、デプロイ前の必須処理）
  5. [Action] DeployerエージェントによるFirebaseへのデプロイ (`firebase deploy`)
