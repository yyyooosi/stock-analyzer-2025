# Vercel 環境変数クイックガイド

## 🚨 認証エラーが出る場合の確認リスト

### 1. 必須環境変数の設定

Vercelダッシュボード > プロジェクト > **Settings** > **Environment Variables** で以下を設定：

#### NextAuth v5用（どちらかを選択）

**方法A: AUTH_* プレフィックス（推奨）**
```
Name: AUTH_SECRET
Value: K/HPDUDNqsv14ONMZg77rbIR7BYZn/TE+3kgXFOdQWU=
Environment: ✅ Production ✅ Preview ✅ Development

Name: AUTH_TRUST_HOST
Value: true
Environment: ✅ Production ✅ Preview ✅ Development
```

**方法B: NEXTAUTH_* プレフィックス**
```
Name: NEXTAUTH_SECRET
Value: K/HPDUDNqsv14ONMZg77rbIR7BYZn/TE+3kgXFOdQWU=
Environment: ✅ Production ✅ Preview ✅ Development
```

#### GitHub OAuth用（ログイン機能を使う場合）
```
Name: GITHUB_ID
Value: （GitHubで取得したClient ID）
Environment: ✅ Production ✅ Preview ✅ Development

Name: GITHUB_SECRET
Value: （GitHubで取得したClient Secret）
Environment: ✅ Production ✅ Preview ✅ Development
```

### 2. GitHub OAuthアプリの設定

[GitHub Settings](https://github.com/settings/developers) > OAuth Apps > New OAuth App

```
Application name: 米国株分析ツール
Homepage URL: https://（あなたのVercel URL）
Authorization callback URL: https://（あなたのVercel URL）/api/auth/callback/github
```

**重要**: Callback URLは完全一致する必要があります！

### 3. 環境変数設定後の必須手順

1. 環境変数を追加・変更したら、**必ず再デプロイ**
   - Vercel > Deployments > 最新のデプロイ > **...** > **Redeploy**

2. 再デプロイ完了まで待つ（1〜2分）

3. ブラウザのキャッシュをクリア
   - Chrome: `Cmd+Shift+R` (Mac) / `Ctrl+Shift+R` (Windows)

### 4. トラブルシューティング

#### エラー: "There is a problem with the server configuration"

**チェックリスト**:
- [ ] `AUTH_SECRET` または `NEXTAUTH_SECRET` が設定されている
- [ ] `GITHUB_ID` と `GITHUB_SECRET` が設定されている
- [ ] 各環境変数で **Production, Preview, Development** 全てにチェックが入っている
- [ ] GitHub OAuthのCallback URLが完全一致している
- [ ] 環境変数設定後に再デプロイした
- [ ] 再デプロイが完了している（Vercel Deploymentsで確認）

#### エラー: "OAuth認証が未設定です"

これはビルド時に `GITHUB_ID` が設定されていなかったことを意味します。

**解決策**:
1. Vercelで `GITHUB_ID` と `GITHUB_SECRET` を設定
2. **必ず再デプロイ**
3. 再デプロイ完了後、ページをリロード

### 5. Vercelログの確認方法

エラーが続く場合、サーバーログを確認：

1. Vercel > Deployments > 最新のデプロイ
2. **Functions** タブをクリック
3. ログインボタンをクリックしたタイミングのエラーを探す
4. エラーメッセージをコピー

---

## 環境変数が反映されない場合

### 再デプロイの正しい方法

1. Vercel > Deployments
2. 最新のデプロイメントをクリック
3. 右上の **...** メニュー > **Redeploy**
4. **Redeploy** ボタンをクリック（"Use existing Build Cache"のチェックは外す）
5. デプロイ完了まで待つ

### 環境変数の確認方法

Vercelダッシュボードで設定した環境変数を確認：

1. Settings > Environment Variables
2. 各変数をクリックして値を確認
3. Environment列で全てにチェックが入っているか確認

---

## 完全な環境変数リスト

```bash
# 必須（NextAuth）
AUTH_SECRET=（生成された秘密鍵）
AUTH_TRUST_HOST=true

# 必須（GitHub OAuth）
GITHUB_ID=（GitHubのClient ID）
GITHUB_SECRET=（GitHubのClient Secret）

# 自動設定（Vercel Postgres）
POSTGRES_URL=（Vercelが自動設定）
POSTGRES_URL_NON_POOLING=（Vercelが自動設定）
POSTGRES_USER=（Vercelが自動設定）
POSTGRES_HOST=（Vercelが自動設定）
POSTGRES_PASSWORD=（Vercelが自動設定）
POSTGRES_DATABASE=（Vercelが自動設定）
```

---

これで認証エラーは解決するはずです！🎉
