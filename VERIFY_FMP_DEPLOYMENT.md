# FMP API デプロイ確認手順（完全版）

## 🎯 目的

「検索結果 (0件)」の原因を特定し、全米国株スクリーニングを正常に動作させる

---

## ステップ1: 診断エンドポイントでAPI接続をテスト

### 1.1 ブラウザで診断エンドポイントにアクセス

デプロイ先のURLで以下にアクセス:

```
https://your-app.vercel.app/api/test-fmp
```

### 1.2 レスポンスを確認

#### ✅ **成功パターン** (API正常動作):
```json
{
  "timestamp": "2026-01-13T...",
  "apiKeyConfigured": true,
  "apiKeyPreview": "f3FJ...Gdy",
  "testRequest": {
    "success": true,
    "stockCount": 5
  },
  "message": "✅ FMP API is working! Retrieved 5 stocks",
  "sampleStocks": [
    { "symbol": "AAPL", "name": "Apple Inc." },
    { "symbol": "MSFT", "name": "Microsoft Corporation" },
    ...
  ]
}
```

**👉 この場合**: API は正常に動作しています。スクリーナーで結果が表示されない場合は、フィルター条件が厳しすぎる可能性があります。

---

#### ❌ **エラーパターン1: 環境変数未設定**
```json
{
  "timestamp": "2026-01-13T...",
  "apiKeyConfigured": false,
  "message": "❌ FMP_API_KEY is NOT configured in environment variables",
  "hint": "Set FMP_API_KEY in Vercel → Settings → Environment Variables, then Redeploy"
}
```

**👉 対処法**: [ステップ2](#ステップ2-vercel環境変数を設定) に進む

---

#### ❌ **エラーパターン2: APIキー無効**
```json
{
  "timestamp": "2026-01-13T...",
  "apiKeyConfigured": true,
  "apiKeyPreview": "f3FJ...Gdy",
  "testRequest": {
    "success": false,
    "statusCode": 403,
    "error": "HTTP 403: ..."
  },
  "message": "❌ FMP API returned error 403",
  "hint": "API key may be invalid or expired. Get a new key at ..."
}
```

**👉 対処法**: [ステップ3](#ステップ3-apiキーの再取得) に進む

---

#### ❌ **エラーパターン3: ネットワークエラー**
```json
{
  "timestamp": "2026-01-13T...",
  "apiKeyConfigured": true,
  "apiKeyPreview": "f3FJ...Gdy",
  "testRequest": {
    "success": false,
    "error": "fetch failed"
  },
  "message": "❌ Failed to connect to FMP API",
  "hint": "Network error or API endpoint unavailable"
}
```

**👉 対処法**: FMP APIサイトが正常か確認、または時間をおいて再試行

---

## ステップ2: Vercel環境変数を設定

### 2.1 Vercel Dashboardにアクセス

1. https://vercel.com/dashboard にアクセス
2. プロジェクト `stock-analyzer-2025` を選択
3. **Settings** タブ → **Environment Variables** をクリック

### 2.2 環境変数を追加/確認

| Name | Value | Environments |
|------|-------|--------------|
| `FMP_API_KEY` | `f3FJh2JitCLnTYOl9iVSVAe6v9SekGdy` | ✅ Production<br>✅ Preview<br>✅ Development |

### 2.3 **重要: Redeploy を実行**

環境変数を追加・変更した場合、**必ず Redeploy を実行**:

1. **Deployments** タブをクリック
2. 最新デプロイの右側にある **"..."** (3点メニュー) をクリック
3. **"Redeploy"** を選択
4. **"Redeploy"** ボタンをクリックして確定
5. デプロイ完了を待つ (通常 1-3分)

### 2.4 再度診断エンドポイントをテスト

Redeploy完了後、再度 `/api/test-fmp` にアクセスして成功を確認

---

## ステップ3: APIキーの再取得

### 3.1 現在のAPIキーをブラウザで直接テスト

以下のURLをブラウザで開く:

```
https://financialmodelingprep.com/api/v3/stock-screener?limit=5&apikey=f3FJh2JitCLnTYOl9iVSVAe6v9SekGdy
```

#### 正常な場合:
```json
[
  {
    "symbol": "AAPL",
    "companyName": "Apple Inc.",
    "marketCap": 3000000000000,
    ...
  },
  ...
]
```

#### エラーの場合:
```json
{
  "Error Message": "Invalid API KEY. Please retry or visit our documentation to create one FREE https://financialmodelingprep.com/developer/docs"
}
```

### 3.2 新しいAPIキーを取得

1. https://financialmodelingprep.com/developer/docs にアクセス
2. アカウントにログイン (新規登録が必要な場合は無料アカウントを作成)
3. Dashboard → **API Key** セクションで新しいキーを生成
4. 新しいAPIキーをコピー

### 3.3 Vercelの環境変数を更新

1. Vercel Dashboard → Settings → Environment Variables
2. `FMP_API_KEY` の **Edit** をクリック
3. 新しいAPIキーを貼り付け
4. **Save** をクリック
5. **Redeploy** を実行 (ステップ2.3参照)

---

## ステップ4: Vercel Function ログを確認

### 4.1 Functionログにアクセス

1. Vercel Dashboard → **Deployments** タブ
2. 最新のデプロイ (緑のチェックマーク) をクリック
3. **Functions** タブをクリック
4. `/api/screener` を選択
5. **Logs** を確認

### 4.2 期待されるログ (正常時)

```
[Screener] Starting fetchStocksFromFMP...
[Screener] FMP_API_KEY is configured: f3FJ...Gdy
[Screener] FMP params: { ... }
[Screener] Fetching stocks from FMP API...
[FMP] Fetching comprehensive stock data...
[FMP] Fetching stock screener: https://financialmodelingprep.com/api/v3/stock-screener?...
[FMP] Stock screener returned 1000 results
[FMP] Got 1000 stocks from screener
[Screener] FMP API returned 500 valid stocks
```

### 4.3 エラーログのパターン

#### エラー1: 環境変数未設定
```
[Screener] Starting fetchStocksFromFMP...
[Screener] FMP_API_KEY is NOT configured in environment variables
Error: FMP_API_KEY is not configured. Please set the environment variable.
```
**対処**: ステップ2に戻る

#### エラー2: API接続失敗
```
[FMP] Fetching stock screener: ...
[FMP] API Error 403: {"Error Message":"Invalid API KEY..."}
[FMP] Stock screener error: Error: FMP API returned status 403: ...
```
**対処**: ステップ3に戻る

#### エラー3: データなし
```
[FMP] Stock screener returned 0 results
[FMP] Got 0 stocks from screener
[Screener] No stocks found from FMP API
```
**対処**: フィルター条件を確認、またはAPIアカウントの制限を確認

---

## ステップ5: スクリーナー画面で動作確認

### 5.1 スクリーナーページにアクセス

```
https://your-app.vercel.app/screener
```

### 5.2 シンプルな検索を実行

1. すべてのフィルターをクリア
2. または「成長株」プリセットを選択
3. **検索** ボタンをクリック

### 5.3 期待される結果

```
検索結果 (500-1000件)
META, GOOGL, AAPL, MSFT, AMZN, TSLA, NVDA, ...
```

---

## トラブルシューティングチェックリスト

診断エンドポイント (`/api/test-fmp`) で以下を確認:

- [ ] `apiKeyConfigured: true` が表示される
- [ ] `testRequest.success: true` が表示される
- [ ] `stockCount` が 5 になっている
- [ ] `sampleStocks` に銘柄が表示される

Vercel環境変数で以下を確認:

- [ ] `FMP_API_KEY` が設定されている
- [ ] 値が正しいAPIキーになっている
- [ ] Production, Preview, Development **すべて** にチェックが入っている
- [ ] 環境変数追加/変更後に **Redeploy** を実行した

Vercel Functionログで以下を確認:

- [ ] `[Screener] FMP_API_KEY is configured` が表示される
- [ ] `[FMP] Stock screener returned XXX results` が表示される (XXX > 0)
- [ ] エラーメッセージが出ていない

---

## まとめ: 最も可能性が高い原因と対処法

### 原因1: 環境変数未設定 (確率: 60%)

**症状**: `/api/test-fmp` で `apiKeyConfigured: false`

**対処**:
1. Vercel → Settings → Environment Variables
2. `FMP_API_KEY` を追加
3. **Redeploy**

---

### 原因2: Redeploy未実行 (確率: 30%)

**症状**: 環境変数は設定されているが、`/api/test-fmp` で `apiKeyConfigured: false`

**対処**:
1. Deployments タブ
2. 最新デプロイの **"..."** → **"Redeploy"**
3. デプロイ完了を待つ

---

### 原因3: APIキー無効 (確率: 10%)

**症状**: `/api/test-fmp` で `statusCode: 403`

**対処**:
1. https://financialmodelingprep.com/developer/docs で新しいキーを生成
2. Vercel環境変数を更新
3. **Redeploy**

---

## 次のステップ

1. **まず**: `/api/test-fmp` にアクセスして現状を確認
2. **次に**: エラーパターンに応じて上記の対処法を実施
3. **最後**: スクリーナーで 1000銘柄の表示を確認

もし上記すべてを試しても解決しない場合は、以下の情報を提供してください:

- `/api/test-fmp` のレスポンス全文
- Vercel Function ログ (`/api/screener`) のエラーメッセージ
- 環境変数設定のスクリーンショット (値は伏せてOK)
