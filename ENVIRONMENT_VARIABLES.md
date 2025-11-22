# 環境変数設定ガイド

## 概要

このアプリケーションは、TwitterとAlpha Vantageの2つの外部APIを使用します。
セキュリティ向上のため、**すべてのAPIキーはバックエンドで管理**され、フロントエンドには露出しません。

## 必要な環境変数

### 1. Alpha Vantage API Key（株価データ）

```bash
ALPHA_VANTAGE_API_KEY=your_alpha_vantage_api_key_here
```

- **取得先**: https://www.alphavantage.co/support/#api-key
- **用途**: 株価データと履歴チャートの取得
- **注意**: `NEXT_PUBLIC_` プレフィックスは**付けない**こと

### 2. Twitter Bearer Token（ツイートデータ）

```bash
TWITTER_BEARER_TOKEN=your_twitter_bearer_token_here
```

- **取得先**: https://developer.twitter.com/en/portal/dashboard
- **用途**: 暴落関連ツイートの検索と取得
- **注意**: `NEXT_PUBLIC_` プレフィックスは**付けない**こと

## セットアップ手順

### ローカル環境

1. プロジェクトルートに `.env.local` ファイルを作成:

```bash
cp .env.local.example .env.local
```

2. `.env.local` を編集して、実際のAPIキーを設定:

```bash
# Alpha Vantage API Key (サーバーサイド専用)
ALPHA_VANTAGE_API_KEY=your_actual_alpha_vantage_key

# Twitter API Bearer Token (サーバーサイド専用)
TWITTER_BEARER_TOKEN=your_actual_twitter_bearer_token
```

3. 開発サーバーを起動:

```bash
npm run dev
```

### Vercel本番環境

1. Vercelプロジェクトの設定ページにアクセス:
   - https://vercel.com/your-username/your-project/settings/environment-variables

2. 以下の環境変数を追加:
   - `ALPHA_VANTAGE_API_KEY`: Alpha Vantageから取得したAPIキー
   - `TWITTER_BEARER_TOKEN`: Twitter Developer Portalから取得したBearer Token

3. **古い環境変数を削除**（もし存在する場合）:
   - ❌ `NEXT_PUBLIC_ALPHA_VANTAGE_API_KEY`（削除）
   - ❌ `NEXT_PUBLIC_TWITTER_BEARER_TOKEN`（削除）

4. 再デプロイ（Gitにpushすれば自動デプロイ）

## セキュリティ改善

### 変更前（セキュリティリスク）

```bash
# ❌ フロントエンドに露出（危険）
NEXT_PUBLIC_ALPHA_VANTAGE_API_KEY=xxx
NEXT_PUBLIC_TWITTER_BEARER_TOKEN=xxx
```

- APIキーがブラウザのJavaScriptに含まれる
- ユーザーがDevToolsで簡単に閲覧可能
- APIキーの悪用リスクが高い

### 変更後（セキュア）

```bash
# ✅ サーバーサイドのみ（安全）
ALPHA_VANTAGE_API_KEY=xxx
TWITTER_BEARER_TOKEN=xxx
```

- APIキーはサーバーサイドのみで使用
- ブラウザには一切露出しない
- Next.js API Routesを経由してデータ取得

## API エンドポイント

### 株価データAPI

- **Quote**: `/api/stock/quote?symbol=AAPL`
- **Time Series**: `/api/stock/timeseries?symbol=AAPL`

### ツイート検索API

- **Search**: `/api/twitter/search?query=crash&symbol=AAPL&max_results=100`

## デモモード

APIキーが設定されていない場合、アプリケーションは自動的にデモモードで動作します：

- サンプル株価データを生成
- サンプルツイートを表示
- すべての機能をテスト可能

ユーザーは「実データを使用」トグルで、リアルデータとデモデータを切り替えられます。

## トラブルシューティング

### Alpha Vantage API

**問題**: "API rate limit exceeded"

**解決策**:
- Alpha Vantage無料プランは1分間に5回まで
- 少し待ってから再試行
- デモモードに切り替えてテスト

### Twitter API

**問題**: "403 Access denied"

**解決策**:
1. アプリがX Developer Portalの**プロジェクト内**にあることを確認
2. Bearer Tokenを再生成
3. 詳細は `X_API_修正手順.md` を参照

## よくある質問

### Q: NEXT_PUBLIC_ プレフィックスは必要？

A: **いいえ**。セキュリティのため、`NEXT_PUBLIC_` プレフィックスは使用しません。
すべてのAPIキーはサーバーサイド専用です。

### Q: .env.local をGitにコミットしていい？

A: **絶対にダメ**。`.env.local` は `.gitignore` に含まれています。
APIキーは機密情報なので、絶対にバージョン管理システムにコミットしないでください。

### Q: ローカルとVercelで異なる値を使える？

A: **はい**。ローカルは `.env.local`、VercelはVercelの環境変数設定を使用します。
開発用と本番用で異なるAPIキーを使うことができます。

## 参考リンク

- [Next.js Environment Variables](https://nextjs.org/docs/basic-features/environment-variables)
- [Alpha Vantage Documentation](https://www.alphavantage.co/documentation/)
- [Twitter API Documentation](https://developer.twitter.com/en/docs/twitter-api)
