# Vercel環境変数設定ガイド

## 必須の環境変数

Vercelダッシュボード > Settings > Environment Variables で以下を設定：

### 1. NextAuth.js設定

```
Name: NEXTAUTH_URL
Value: https://stock-analyzer-2025-huzw-bpnmev1zd-yyoos-projects.vercel.app
Environment: Production, Preview, Development
```

```
Name: NEXTAUTH_SECRET
Value: K/HPDUDNqsv14ONMZg77rbIR7BYZn/TE+3kgXFOdQWU=
Environment: Production, Preview, Development
```

### 2. GitHub OAuth（オプション）

本番環境用のGitHub OAuthアプリを作成してから設定：

```
Name: GITHUB_ID
Value: （GitHub OAuthのClient ID）
Environment: Production, Preview, Development
```

```
Name: GITHUB_SECRET
Value: （GitHub OAuthのClient Secret）
Environment: Production, Preview, Development
```

### 3. Google OAuth（オプション）

```
Name: GOOGLE_CLIENT_ID
Value: （Google OAuthのClient ID）
Environment: Production, Preview, Development
```

```
Name: GOOGLE_CLIENT_SECRET
Value: （Google OAuthのClient Secret）
Environment: Production, Preview, Development
```

## 設定後の手順

1. 環境変数を保存
2. Deployments > 最新のデプロイ > ... > Redeploy
3. サイトにアクセスして動作確認

## GitHub OAuth設定（認証を使う場合）

GitHub Settings > Developer settings > OAuth Apps > New OAuth App

```
Application name: 米国株分析ツール (Production)
Homepage URL: https://stock-analyzer-2025-huzw-bpnmev1zd-yyoos-projects.vercel.app
Authorization callback URL: https://stock-analyzer-2025-huzw-bpnmev1zd-yyoos-projects.vercel.app/api/auth/callback/github
```
