# 環境変数設定ガイド

## 概要

このアプリケーションは、Alpha Vantage などの外部 API を使用します。
セキュリティ向上のため、**すべての API キーはバックエンドで管理**され、フロントエンドには露出しません。

なお、ソーシャルセンチメントデータは **StockTwits API** から取得します（認証不要・APIキー不要）。

## 必要な環境変数

### 1. Alpha Vantage API Key（株価データ）

```bash
ALPHA_VANTAGE_API_KEY=your_alpha_vantage_api_key_here
```

- **取得先**: https://www.alphavantage.co/support/#api-key
- **用途**: 株価データと履歴チャートの取得
- **注意**: `NEXT_PUBLIC_` プレフィックスは**付けない**こと

### 2. CRON_SECRET（バッチ処理認証）

```bash
CRON_SECRET=your_cron_secret_here
```

- **用途**: GitHub Actions から `/api/twitter/batch` を呼び出す際の認証
- **設定**: 任意の安全な文字列を設定し、GitHub Secrets にも同じ値を登録

### 3. StockTwits API（ソーシャルセンチメント）

**APIキー不要・設定不要**。`stockTwitsEnabled: true` が常に返されます。

- **エンドポイント**: `https://api.stocktwits.com/api/2/streams/symbol/{SYMBOL}.json`
- **用途**: ティッカー別の最新30件の投稿取得・センチメント分析
- **制限**: ~60 リクエスト/分

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
   - `CRON_SECRET`: バッチ処理認証用の任意の文字列

3. **古い環境変数を削除**（もし存在する場合）:
   - ❌ `APIFY_API_TOKEN`（削除 → StockTwits に移行済み、APIキー不要）
   - ❌ `TWITTER_BEARER_TOKEN`（削除 → StockTwits に移行済み）
   - ❌ `NEXT_PUBLIC_ALPHA_VANTAGE_API_KEY`（削除）

4. 再デプロイ（Git に push すれば自動デプロイ）

### GitHub Actions（バッチ処理）

8 時間ごとのセンチメントバッチ処理を動かすために GitHub Secrets を設定:

1. リポジトリの Settings → Secrets and variables → Actions
2. 以下を登録:
   - `VERCEL_APP_URL`: `https://your-app.vercel.app`（末尾スラッシュなし）
   - `CRON_SECRET`: `.env.local` と同じ値

## セキュリティ

すべての API キーはサーバーサイドのみで使用:

```bash
# ✅ サーバーサイドのみ（安全）
ALPHA_VANTAGE_API_KEY=xxx
CRON_SECRET=xxx
```

- API キーはブラウザには一切露出しない
- Next.js API Routes を経由してデータ取得

## API エンドポイント

### 株価データ API

- **Quote**: `/api/stock/quote?symbol=AAPL`
- **Time Series**: `/api/stock/timeseries?symbol=AAPL`

### ソーシャルセンチメント API（StockTwits）

- **Search by symbol**: `/api/twitter/search?symbol=AAPL`（StockTwits、認証不要）
- **Sentiment**: `/api/twitter/sentiment?symbol=AAPL`
- **Batch**: `POST /api/twitter/batch` (GitHub Actions から呼び出し)

## デモモード

株価 API キーが設定されていない場合、アプリケーションは自動的にデモモードで動作します:

- サンプル株価データを生成
- センチメントデータなし（「ウォッチリストに追加すると収集開始」と表示）
- すべての機能をテスト可能

## トラブルシューティング

### StockTwits エラー

**問題**: バッチ処理が失敗する

**解決策**:
1. ネットワーク接続を確認（StockTwits API に到達できるか）
2. レート制限超過の場合は数分待ってから再試行（~60 リクエスト/分）
3. `/api/check-env` で `stockTwitsEnabled: true` が返されるか確認

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
- [StockTwits API](https://api-docs.stocktwits.com/)
