# デプロイガイド - 本番環境へのデプロイ

## Vercelへのデプロイ（推奨）

### 前提条件
- GitHubアカウント
- Vercelアカウント（無料）
- このリポジトリがGitHubにプッシュされている

### ステップ1: Vercelアカウントの準備

1. https://vercel.com にアクセス
2. "Sign Up" をクリック
3. "Continue with GitHub" を選択してGitHubアカウントで登録

### ステップ2: プロジェクトのインポート

1. Vercelダッシュボードで "Add New..." → "Project" をクリック
2. "Import Git Repository" セクションで `stock-analyzer-2025` を検索
3. "Import" をクリック

### ステップ3: プロジェクト設定

**Configure Project** 画面で:

1. **Project Name**: `stock-analyzer-2025` (またはお好みの名前)
2. **Framework Preset**: Next.js (自動検出されるはず)
3. **Root Directory**: `./` (デフォルト)
4. **Build Command**: `npm run build` (デフォルト)
5. **Output Directory**: `.next` (デフォルト)

### ステップ4: 環境変数の設定

**Environment Variables** セクションで以下を追加:

```
Name: FMP_API_KEY
Value: f3FJh2JitCLnTYOl9iVSVAe6v9SekGdy
```

オプション（Alpha Vantage APIを使う場合）:
```
Name: ALPHA_VANTAGE_API_KEY
Value: your_alpha_vantage_key
```

### ステップ5: デプロイ

1. "Deploy" ボタンをクリック
2. ビルドプロセスが開始されます（通常2-3分）
3. デプロイ完了後、URLが表示されます（例: `https://stock-analyzer-2025.vercel.app`）

### ステップ6: 動作確認

デプロイ完了後、以下のURLで確認:

1. **ホームページ**: `https://your-app.vercel.app`
2. **診断API**: `https://your-app.vercel.app/api/test-fmp`
3. **スクリーニング**: `https://your-app.vercel.app/screener`

---

## Netlifyへのデプロイ（代替案）

### ステップ1: Netlifyアカウント

1. https://netlify.com にアクセス
2. GitHubアカウントでサインアップ

### ステップ2: 新規サイト作成

1. "Add new site" → "Import an existing project"
2. "GitHub" を選択
3. `stock-analyzer-2025` リポジトリを選択

### ステップ3: ビルド設定

```
Build command: npm run build
Publish directory: .next
```

### ステップ4: 環境変数

**Site settings** → **Environment variables**:

```
FMP_API_KEY = f3FJh2JitCLnTYOl9iVSVAe6v9SekGdy
```

### ステップ5: デプロイ

"Deploy site" をクリック

---

## ローカルマシンでの本番ビルドテスト

デプロイ前にローカルで本番ビルドをテスト:

```bash
# 本番ビルドを作成
npm run build

# 本番モードで起動
npm start

# ブラウザで http://localhost:3000 にアクセス
```

---

## トラブルシューティング

### ビルドエラー: "Module not found"

```bash
# 依存関係を再インストール
rm -rf node_modules package-lock.json
npm install
```

### 環境変数が反映されない

1. Vercel/Netlifyダッシュボードで環境変数を確認
2. プロジェクトを再デプロイ（Vercel: Deployments → ... → Redeploy）

### APIが動作しない

1. **診断エンドポイントで確認**: `/api/test-fmp`
2. **ブラウザのコンソール**でエラーを確認（F12）
3. **Vercelのログ**を確認（Dashboard → Deployments → Function Logs）

### "fetch failed" エラー

- FMP APIのレート制限を超えている可能性
- FMP APIキーが無効または期限切れ
- FMP APIのステータスページを確認: https://status.financialmodelingprep.com/

---

## 継続的デプロイ（CI/CD）

Vercel/Netlifyは自動的にGitHubと連携:

1. **main/masterブランチ**にプッシュ → 本番環境に自動デプロイ
2. **その他のブランチ**にプッシュ → プレビュー環境を自動作成
3. **プルリクエスト**作成 → プレビューURLが自動生成

---

## カスタムドメインの設定（オプション）

### Vercelでカスタムドメイン設定

1. Vercelダッシュボード → Settings → Domains
2. "Add" をクリック
3. ドメイン名を入力（例: `stockanalyzer.com`）
4. DNSレコードを設定:
   ```
   Type: CNAME
   Name: @
   Value: cname.vercel-dns.com
   ```

---

## パフォーマンス最適化

### キャッシング戦略

Next.jsの`revalidate`を使用してAPIレスポンスをキャッシュ:

```typescript
// app/api/screener/route.ts に追加
export const revalidate = 3600; // 1時間キャッシュ
```

### 画像最適化

Next.jsのImage最適化を活用:

```tsx
import Image from 'next/image';

<Image src="/logo.png" width={200} height={50} alt="Logo" />
```

---

## セキュリティ

### 環境変数の保護

- ✅ `.env.local` は `.gitignore` に含まれている
- ✅ APIキーはバックエンドでのみ使用
- ✅ クライアント側にAPIキーは公開されない

### CORS設定（必要な場合）

```typescript
// next.config.js
module.exports = {
  async headers() {
    return [
      {
        source: '/api/:path*',
        headers: [
          { key: 'Access-Control-Allow-Origin', value: 'https://your-domain.com' },
        ],
      },
    ];
  },
};
```

---

## モニタリング

### Vercel Analytics（オプション）

1. Vercel Dashboard → Analytics
2. "Enable Analytics" をクリック
3. ページビュー、パフォーマンス、エラーを追跡

### Sentry統合（エラー追跡）

```bash
npm install @sentry/nextjs

# Sentryプロジェクト設定
npx @sentry/wizard -i nextjs
```

---

## サポート

デプロイに問題がある場合:

- **Vercelドキュメント**: https://vercel.com/docs
- **Next.jsドキュメント**: https://nextjs.org/docs/deployment
- **GitHubリポジトリ**: https://github.com/yyyooosi/stock-analyzer-2025/issues
