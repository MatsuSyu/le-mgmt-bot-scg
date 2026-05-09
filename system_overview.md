# LITTLE EAGLES / 管理・出欠ボット システム概要

## 1. コンセプト
本システムは、少年野球チーム「Little Eagles」の運営を効率化し、指導者と保護者のコミュニケーションを円滑にするためのプラットフォームです。AIを活用した自動応答、出欠管理、配車計画の可視化を統合しています。

## 2. 主要エージェント
当プロジェクトは、複数の専門AIエージェントが連携して開発・メンテナンスを行っています：
- **Planning (計画)**: 全体設計とタスク分割
- **UI/UX (意匠)**: プレミアムなユーザー体験の提供
- **Integration (整合性)**: フロント・バックエンド間のデータ整合性担保
- **Documentation (Librarian)**: システムドキュメントの最新化

## 3. テクノロジー・スタック
- **基盤**: Firebase (Functions, Hosting, Firestore)
- **AI**: Google Gemini 1.5 Flash (Model: gemini-3-flash-preview as per config)
- **UI**: React 19 + Vite (Vanilla CSSによるプレミアム・デザイン)
- **外部API**: 
    - LINE Messaging API / LIFF SDK
    - **Google Sheets API**: 出欠ログの可視化。
        - Spreadsheet ID: `1pbRgZCdziSNGuSqcu50ldRRRVni1yU05zElnmICGYb4`

## 4. 開発・運用フローの整合性
当プロジェクトでは、AIエージェントによる自動開発パイプラインを採用しており、以下の原則を徹底しています：
1. **Document-First**: コード変更前に設計ドキュメントを更新。
2. **Integrity Check**: 新機能追加時に既存機能（管理画面・LIFF・スプレッドシート）への影響を自動検証。
3. **Automated Documentation**: `walkthrough.md` 等を通じた開発過程の透明化。

## 5. 主要機能
- **メンバー管理**: 複数メンバー連携、LIFF上での連携解除、追加連携をサポート。CSV形式による一括登録機能。
- **予定管理**: チーム予定と学校行事の分離、AIによる変更点要約、スプレッドシートへの同期。
- **球場確保管理**: グラウンドの確保状況（申請中/確保済/空きあり）を別途管理。
- **出欠・配車**: LIFFアプリによる直感的なカード形式リストと回答フォーム。
- **ログ管理**: 管理画面での対話ログ閲覧、操作履歴のページング表示。
