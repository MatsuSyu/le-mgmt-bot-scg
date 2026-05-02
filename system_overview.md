# システム概要：Little Eagles チーム運営支援 Bot

少年野球チーム「Little Eagles」の事務局・保護者の負担を軽減し、チームの活気を最大化するためのインテリジェンス・システムです。

## 1. システムの目的
- **自動化**: 体験希望メールの検知や、出欠・配車の集計を自動化し、管理者の手作業をゼロに近づけます。
- **可視化**: リアルタイムなダッシュボードにより、チームの現状（出欠状況・配車不足）を瞬時に把握できます。
- **エンゲージメント**: AI（Gemini）がチームの人格（スコア・アシスタント）として振る舞い、温かみのあるコミュニケーションを促進します。

## 2. システム構成図
```mermaid
graph TD
    subgraph "External"
        Gmail[Gmail (体験希望)]
        LINE[LINE App (保護者/管理者)]
    end

    subgraph "Firebase (Backend)"
        Functions[Firebase Functions (Python)]
        Firestore[(Firestore DB)]
        Hosting[Firebase Hosting]
    end

    subgraph "Frontend"
        LIFF[LIFF App (出欠回答)]
        Admin[Admin Dashboard (管理画面)]
    end

    subgraph "External Services"
        Sheets[Google Sheets (閲覧用)]
        Gemini[Gemini AI (解析/生成)]
    end

    Gmail -->|Pub/Sub| Functions
    LINE -->|Messaging API| Functions
    Functions -->|解析依頼| Gemini
    Functions -->|保存| Firestore
    Functions -->|同期| Sheets
    LIFF -->|提出| Functions
    Admin -->|同期| Firestore
    Hosting -->|公開| LIFF
    Hosting -->|公開| Admin
```

## 3. テクノロジー・スタック
- **言語**: Python 3.13 (Backend), TypeScript (Frontend)
- **基盤**: Firebase (Functions, Hosting, Firestore)
- **AI**: Google Gemini 1.5 Flash
- **UI**: React 19 + Vite (Admin Dashboard, LIFF App)
- **外部API**: LINE Messaging API / LIFF SDK, Google Sheets API
