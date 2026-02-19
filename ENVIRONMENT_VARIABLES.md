# 環境変数設定ガイド

## 概要

このアプリケーションは、Apify と Alpha Vantage などの外部 API を使用します。
セキュリティ向上のため、**すべての API キーはバックエンドで管理**され、フロントエンドには露出しません。

## 必要な環境変数

### 1. Alpha Vantage API Key（株価データ）

```bash
ALPHA_VANTAGE_API_KEY=your_alpha_vantage_api_key_here
```

- **取得先**: https://www.alphavantage.co/support/#api-key
- **用途**: 株価データと履歴チャートの取得
- **注意**: `NEXT_PUBLIC_` プレフィックスは**付けない**こと

### 2. Apify API Token（X ツイートデータ）

```bash
APIFY_API_TOKEN=apify_api_your_token_here
```

- **取得先**: https://console.apify.com/account/integrations
- **用途**: X（旧 Twitter）のツイート検索・センチメント分析バッチ処理
- **無料枠**: $5/月クレジット → 約 10,000 ツイート/月
- **注意**: `NEXT_PUBLIC_` プレフィックスは**付けない**こと

### 3. CRON_SECRET（バッチ処理認証）

```bash
CRON_SECRET=your_cron_secret_here
```

- **用途**: GitHub Actions から `/api/twitter/batch` を呼び出す際の認証
- **設定**: 任意の安全な文字列を設定し、GitHub Secrets にも同じ値を登録

## セットアップ手順

### ローカル環境

1. プロジェクトルートに `.env.local` ファイルを作成:

```bash
cp .env.example .env.local
```

2. `.env.local` を編集して、実際の API キーを設定:

```bash
# Alpha Vantage API Key (サーバーサイド専用)
ALPHA_VANTAGE_API_KEY=your_actual_alpha_vantage_key

# Apify API Token (サーバーサイド専用)
APIFY_API_TOKEN=apify_api_your_actual_token

# バッチ処理認証シークレット
CRON_SECRET=your_secret_string
```

3. 開発サーバーを起動:

```bash
npm run dev
```

### Vercel 本番環境

1. Vercel プロジェクトの設定ページにアクセス:
   - https://vercel.com/your-username/your-project/settings/environment-variables

2. 以下の環境変数を追加:
   - `ALPHA_VANTAGE_API_KEY`: Alpha Vantage から取得した API キー
   - `APIFY_API_TOKEN`: Apify Console から取得した API トークン
   - `CRON_SECRET`: バッチ処理認証用の任意の文字列

3. **古い環境変数を削除**（もし存在する場合）:
   - ❌ `TWITTER_BEARER_TOKEN`（削除 → Apify に移行済み）
   - ❌ `NEXT_PUBLIC_ALPHA_VANTAGE_API_KEY`（削除）

4. 再デプロイ（Git に push すれば自動デプロイ）

### GitHub Actions（バッチ処理）

15 分ごとのセンチメントバッチ処理を動かすために GitHub Secrets を設定:

1. リポジトリの Settings → Secrets and variables → Actions
2. 以下を登録:
   - `VERCEL_APP_URL`: `https://your-app.vercel.app`（末尾スラッシュなし）
   - `CRON_SECRET`: `.env.local` と同じ値

## セキュリティ

すべての API キーはサーバーサイドのみで使用:

```bash
# ✅ サーバーサイドのみ（安全）
ALPHA_VANTAGE_API_KEY=xxx
APIFY_API_TOKEN=xxx
CRON_SECRET=xxx
```

- API キーはブラウザには一切露出しない
- Next.js API Routes を経由してデータ取得

## API エンドポイント

### 株価データ API

- **Quote**: `/api/stock/quote?symbol=AAPL`
- **Time Series**: `/api/stock/timeseries?symbol=AAPL`

### ツイート API

- **Search**: `/api/twitter/search?query=crash&max_results=20`
- **Sentiment**: `/api/twitter/sentiment?symbol=AAPL`
- **Batch**: `POST /api/twitter/batch` (GitHub Actions から呼び出し)

## デモモード

API キーが設定されていない場合、アプリケーションは自動的にデモモードで動作します:

- サンプル株価データを生成
- センチメントデータなし（「ウォッチリストに追加すると収集開始」と表示）
- すべての機能をテスト可能

## トラブルシューティング

### Apify エラー

**問題**: バッチ処理が失敗する

**解決策**:
1. `APIFY_API_TOKEN` が正しく設定されているか確認
2. Apify Console でクレジット残高を確認（無料枠: $5/月）
3. Actor `apidojo/tweet-scraper` が利用可能か確認

### バッチが実行されない

**問題**: センチメントデータが更新されない

**解決策**:
1. GitHub Actions の実行ログを確認
2. `VERCEL_APP_URL` と `CRON_SECRET` が GitHub Secrets に正しく設定されているか確認
3. ウォッチリストに銘柄が登録されているか確認（銘柄がないとバッチはスキップ）

## よくある質問

### Q: NEXT_PUBLIC_ プレフィックスは必要？

A: **いいえ**。セキュリティのため、`NEXT_PUBLIC_` プレフィックスは使用しません。
すべての API キーはサーバーサイド専用です。

### Q: .env.local を Git にコミットしていい？

A: **絶対にダメ**。`.env.local` は `.gitignore` に含まれています。
API キーは機密情報なので、絶対にバージョン管理システムにコミットしないでください。

## 参考リンク

- [Next.js Environment Variables](https://nextjs.org/docs/basic-features/environment-variables)
- [Alpha Vantage Documentation](https://www.alphavantage.co/documentation/)
- [Apify Documentation](https://docs.apify.com/)
- [Apify Tweet Scraper](https://apify.com/apidojo/tweet-scraper)
