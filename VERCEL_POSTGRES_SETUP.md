# Vercel Postgres セットアップガイド

## 完全版：Vercel Postgresを使用したデプロイ手順

### ステップ1: Vercel Postgresデータベースの作成

1. **Vercelダッシュボード**にアクセス
   ```
   https://vercel.com/dashboard
   ```

2. プロジェクトを選択（stock-analyzer-2025）

3. **Storage**タブをクリック

4. **Create Database**をクリック

5. **Postgres**を選択

6. データベース設定：
   - Database Name: `stock-analyzer-db`（任意の名前）
   - Region: `Washington, D.C., USA (iad1)` （推奨）

7. **Create**をクリック

8. **環境変数が自動的に追加されます**：
   - `POSTGRES_URL`
   - `POSTGRES_URL_NON_POOLING`
   - `POSTGRES_USER`
   - `POSTGRES_HOST`
   - `POSTGRES_PASSWORD`
   - `POSTGRES_DATABASE`

### ステップ2: NextAuth.js環境変数の設定

Storageタブから、**Settings** > **Environment Variables**に移動：

**重要**: NextAuth.js v5では環境変数のプレフィックスが変更されています。以下の2つの方法があります：

#### 方法A: AUTH_* プレフィックス（推奨）
```
Name: AUTH_SECRET
Value: K/HPDUDNqsv14ONMZg77rbIR7BYZn/TE+3kgXFOdQWU=
Environment: Production, Preview, Development

Name: AUTH_TRUST_HOST
Value: true
Environment: Production, Preview, Development
```

#### 方法B: NEXTAUTH_* プレフィックス（後方互換性）
```
Name: NEXTAUTH_SECRET
Value: K/HPDUDNqsv14ONMZg77rbIR7BYZn/TE+3kgXFOdQWU=
Environment: Production, Preview, Development

※ NEXTAUTH_URLは不要です（trustHost: trueがコードに設定済み）
```

**どちらかを選択してください**（両方設定する必要はありません）

### ステップ3: デプロイ

1. GitHubに最新のコードをプッシュ（自動デプロイが開始）

2. または、手動で再デプロイ：
   - **Deployments**タブ > 最新のデプロイ > **...** > **Redeploy**

### ステップ4: データベースの初期化

デプロイ完了後、以下のURLにアクセス：

```
https://stock-analyzer-2025-huzw-bpnmev1zd-yyoos-projects.vercel.app/api/db-init
```

成功すると以下のレスポンスが返ります：
```json
{
  "success": true,
  "message": "データベースの初期化が完了しました"
}
```

### ステップ5: OAuth設定（オプション）

#### GitHub OAuth

1. [GitHub Settings](https://github.com/settings/developers) > **OAuth Apps** > **New OAuth App**

2. 入力内容：
   ```
   Application name: 米国株分析ツール (Production)
   Homepage URL: https://stock-analyzer-2025-huzw-bpnmev1zd-yyoos-projects.vercel.app
   Authorization callback URL: https://stock-analyzer-2025-huzw-bpnmev1zd-yyoos-projects.vercel.app/api/auth/callback/github
   ```

3. Client IDとSecretを取得

4. Vercelの環境変数に追加：
   ```
   Name: GITHUB_ID
   Value: （取得したClient ID）

   Name: GITHUB_SECRET
   Value: （取得したClient Secret）
   ```

#### Google OAuth（オプション）

1. [Google Cloud Console](https://console.cloud.google.com/)で OAuth 2.0クライアントIDを作成

2. Callback URL:
   ```
   https://stock-analyzer-2025-huzw-bpnmev1zd-yyoos-projects.vercel.app/api/auth/callback/google
   ```

3. Vercelの環境変数に追加：
   ```
   Name: GOOGLE_CLIENT_ID
   Value: （取得したClient ID）

   Name: GOOGLE_CLIENT_SECRET
   Value: （取得したClient Secret）
   ```

### ステップ6: 動作確認

1. **ホームページ**にアクセス
   ```
   https://stock-analyzer-2025-huzw-bpnmev1zd-yyoos-projects.vercel.app
   ```

2. **ログイン**（OAuth設定した場合）
   - 右上の「ログイン」ボタンをクリック
   - GitHubまたはGoogleでログイン

3. **ウォッチリスト機能をテスト**
   - 株価検索で銘柄を検索（例: AAPL）
   - 「ウォッチリストに追加」をクリック
   - 「マイウォッチリスト」ページで確認

4. **複数デバイスで同期確認**（ログイン済みの場合）
   - 別のブラウザまたはデバイスで同じアカウントでログイン
   - ウォッチリストが同期されていることを確認

---

## トラブルシューティング

### データベース接続エラー

**エラー**: "データベースが利用できません"

**解決策**:
1. Vercel Storage タブでPostgresが正常に作成されているか確認
2. 環境変数 `POSTGRES_URL` が設定されているか確認
3. `/api/db-init` にアクセスしてテーブルを初期化

### 認証エラー

**エラー**: "There is a problem with the server configuration"

**解決策**:
1. `AUTH_SECRET` または `NEXTAUTH_SECRET` が設定されているか確認
2. `AUTH_TRUST_HOST=true` が設定されているか確認（または trustHost: true がコードに設定済み）
3. OAuthアプリのCallback URLが正しいか確認
4. GitHub OAuth使用時、`GITHUB_ID` と `GITHUB_SECRET` が正しく設定されているか確認
5. 環境変数を追加・変更した後は**必ず再デプロイ**してください
6. Vercelの Environment Variables で、**Production, Preview, Development** 全てにチェックが入っているか確認

### ウォッチリストが保存されない

**解決策**:
1. ログインしているか確認（右上にユーザー名が表示されているか）
2. ブラウザのコンソールでエラーを確認
3. `/api/watchlist` エンドポイントが正常に動作しているか確認

---

## データベーススキーマ

```sql
CREATE TABLE watchlist (
  id SERIAL PRIMARY KEY,
  user_email TEXT NOT NULL,
  symbol TEXT NOT NULL,
  added_at TIMESTAMP NOT NULL DEFAULT NOW(),
  UNIQUE(user_email, symbol)
);

CREATE INDEX idx_user_email ON watchlist(user_email);
```

---

## まとめ

✅ Vercel Postgres: サーバーレス環境で動作するPostgreSQLデータベース
✅ NextAuth.js: GoogleとGitHubでのOAuth認証
✅ 複数デバイス同期: ログインすればどこからでもアクセス可能
✅ 自動デプロイ: GitHubへのpushで自動的にデプロイ

これで完全な本番環境が構築されました！🎉
