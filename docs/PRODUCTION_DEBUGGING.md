# 本番環境でのデバッグガイド

本番環境（Vercel等）でスクリーニングAPIが動作しない場合のデバッグ手順です。

## 📊 ログの確認方法

### Vercelでのログ確認

1. **Vercelダッシュボードにアクセス**
   - https://vercel.com/dashboard
   - プロジェクトを選択

2. **ログを表示**
   - 左メニュー → "Logs" または "Runtime Logs"
   - 最新のデプロイメントを選択

3. **エラーを検索**
   - 検索バーで以下のキーワードを検索:
     - `[Screener]` - スクリーニングAPI関連
     - `[FMP]` - FMP API呼び出し関連
     - `error` - エラーメッセージ
     - `Error` - エラー全般

### 重要なログメッセージ

#### 成功時のログ

```
[Screener] Starting stock data fetch...
[Screener] Environment: production
[Screener] FMP_API_KEY is configured: f3FJ...
[FMP] Fetching comprehensive stock data using NEW working endpoints...
[FMP] API Key (first 4 chars): f3FJ...
[FMP] Calling FMP API...
[FMP] Response status: 200 OK
[FMP] Symbol lists returned 8000 symbols
[FMP] Got 1000 quotes
[Screener] Processing 950 stocks with filters...
```

#### エラー時のログパターン

**1. APIキー未設定**
```
[FMP] API key not configured - cannot fetch symbols
[Screener] Error message: FMP_API_KEY is not configured
```

**2. 認証エラー**
```
[FMP] Response status: 401 Unauthorized
[FMP] API Error 401: Invalid API key
[Screener] Error message: FMP API authentication failed (401)
```

**3. レート制限**
```
[FMP] Response status: 429 Too Many Requests
[Screener] Error message: FMP API rate limit exceeded (429)
```

**4. ネットワークエラー**
```
[Screener] Fetch error: fetch failed
[Screener] Error message: network error
```

## 🔍 環境変数の確認

### Vercelで環境変数を確認

1. **ダッシュボードで確認**
   - プロジェクト → Settings → Environment Variables
   - `FMP_API_KEY` が存在するか確認

2. **値の確認**
   - 値が正しく設定されているか確認（先頭4文字のみ表示される）
   - スペースや改行が含まれていないか確認

3. **適用環境の確認**
   - Production, Preview, Development のどれに適用されているか確認
   - 通常は "Production" と "Preview" の両方に設定

4. **環境変数を更新した場合**
   - 再デプロイが必要
   - Settings → Deployments → 最新デプロイ → "Redeploy"

### APIキーのテスト

本番環境のAPIキーが有効か直接テスト:

```bash
# ローカルで確認（本番環境と同じAPIキーを使用）
export FMP_API_KEY=your_production_api_key
curl "https://financialmodelingprep.com/api/v3/quote/AAPL?apikey=$FMP_API_KEY"
```

成功すると以下のようなレスポンス:
```json
[
  {
    "symbol": "AAPL",
    "name": "Apple Inc.",
    "price": 150.00,
    "pe": 25.5,
    ...
  }
]
```

## 🧪 本番環境でのテスト

### 1. エンドポイントに直接アクセス

ブラウザまたはcurlで本番環境のAPIを直接テスト:

```bash
# 本番環境のスクリーニングAPI
curl "https://your-app.vercel.app/api/screener" | jq .
```

**成功時のレスポンス**:
```json
{
  "success": true,
  "count": 245,
  "results": [...]
}
```

**エラー時のレスポンス**:
```json
{
  "success": false,
  "error": "FMP APIキーが設定されていません",
  "details": "環境変数FMP_API_KEYを設定してください。",
  "errorType": "API_KEY_MISSING"
}
```

### 2. ブラウザのコンソールで確認

1. 本番環境でスクリーニングページを開く
2. F12キーでデベロッパーツールを開く
3. Consoleタブを確認

**エラーメッセージの例**:
```
[Screener UI] API error: {
  success: false,
  error: "FMP APIから株式データを取得できませんでした。",
  details: "APIキーが正しく設定されているか確認してください。"
}
```

4. Networkタブを確認
   - `/api/screener` のリクエストを選択
   - Response タブでサーバーからのレスポンスを確認
   - Status が 500, 401, 429 などの場合はエラー

## ⚠️ よくある問題と解決方法

### 問題1: 環境変数が設定されていない

**症状**:
- エラーメッセージ: "FMP APIキーが設定されていません"
- ログ: `[FMP] API key not configured`

**解決方法**:
1. Vercel → Settings → Environment Variables
2. `FMP_API_KEY` を追加
3. Value に FMP APIキーを貼り付け
4. Environment: Production と Preview を選択
5. Save
6. 再デプロイ

### 問題2: 環境変数が反映されていない

**症状**:
- 環境変数は設定したのにエラーが出る
- ログに環境変数が見当たらない

**解決方法**:
1. **再デプロイを実行**
   - 環境変数を変更した後は再デプロイが必須
   - Vercel → Deployments → Redeploy

2. **キャッシュをクリア**
   - Vercel → Settings → General → Clear Cache
   - 再デプロイ

### 問題3: APIキーが無効

**症状**:
- エラーメッセージ: "FMP API authentication failed (401)"
- ログ: `Response status: 401 Unauthorized`

**解決方法**:
1. FMPダッシュボードでAPIキーを確認
   - https://financialmodelingprep.com/developer/docs/dashboard
   - APIキーが有効か確認
   - コピー時にスペースや改行が入っていないか確認

2. Vercelの環境変数を更新
   - 正しいAPIキーに変更
   - 再デプロイ

### 問題4: レート制限超過

**症状**:
- エラーメッセージ: "API呼び出し制限に達しました"
- ログ: `Response status: 429 Too Many Requests`

**解決方法**:
1. **使用状況を確認**
   - https://financialmodelingprep.com/developer/docs/dashboard
   - 今日の使用量を確認

2. **待機**
   - 無料プラン: 250リクエスト/日
   - リセット: 12:00 AM UTC (日本時間 午前9時)

3. **アップグレード検討**
   - Starter Plan: 500リクエスト/日
   - Professional Plan: 無制限

### 問題5: ネットワークエラー

**症状**:
- エラーメッセージ: "FMP APIへの接続に失敗しました"
- ログ: `fetch failed` または `network error`

**解決方法**:
1. **FMP APIのステータス確認**
   - https://status.financialmodelingprep.com/
   - FMP側で障害が発生していないか確認

2. **Vercelの接続を確認**
   - Vercelから外部APIへの接続が許可されているか確認
   - 通常は問題ないが、エンタープライズプランの場合は設定が必要な場合がある

3. **再試行**
   - 一時的なネットワーク問題の可能性
   - しばらく待ってから再試行

## 📈 本番環境モニタリング

### エラー率の監視

Vercelのログで以下をモニタリング:

```bash
# エラー数を確認（過去24時間）
grep -c "error" logs.txt

# 成功率を計算
successful=$(grep -c "success: true" logs.txt)
failed=$(grep -c "success: false" logs.txt)
echo "成功率: $(($successful * 100 / ($successful + $failed)))%"
```

### アラート設定

Vercelのログインテグレーションを使用:
- **Sentry**: エラートラッキング
- **LogDrain**: ログをDatadog, Splunkなどに転送
- **Vercel Monitoring**: パフォーマンスとエラーを監視

## 🔧 高度なデバッグ

### カスタムログの追加

必要に応じて、さらに詳細なログを追加:

```typescript
// app/api/screener/route.ts
console.log('[DEBUG] Request headers:', request.headers);
console.log('[DEBUG] Process env keys:', Object.keys(process.env).filter(k => k.includes('FMP')));
console.log('[DEBUG] API response:', JSON.stringify(data).substring(0, 500));
```

### タイムスタンプの追加

パフォーマンス問題のデバッグ:

```typescript
const startTime = Date.now();
const stocks = await fetchStocksFromFMP(filters);
console.log(`[PERF] FMP fetch took ${Date.now() - startTime}ms`);
```

### エラーの詳細をユーザーに表示

開発環境でのみ詳細を表示:

```typescript
return NextResponse.json({
  success: false,
  error: 'データ取得エラー',
  details: process.env.NODE_ENV === 'development' ? error.stack : error.message,
});
```

## 📋 チェックリスト

本番環境でエラーが発生した場合の確認項目:

- [ ] Vercelのログでエラーメッセージを確認
- [ ] 環境変数 `FMP_API_KEY` が設定されている
- [ ] 環境変数が Production と Preview に適用されている
- [ ] 環境変数変更後に再デプロイした
- [ ] FMP APIキーが有効（ダッシュボードで確認）
- [ ] FMP API使用量が制限内（250リクエスト/日）
- [ ] FMP APIのステータスが正常
- [ ] ブラウザコンソールでエラーを確認
- [ ] Network タブで API レスポンスを確認
- [ ] `/api/screener` エンドポイントに直接アクセスしてテスト

## 🆘 サポート

それでも解決しない場合:

1. **詳細情報を収集**
   - Vercelのログ（エラー部分）
   - ブラウザコンソールのエラー
   - Network タブのレスポンス
   - 環境変数のスクリーンショット（値は隠す）

2. **GitHub Issueを作成**
   - https://github.com/yyyooosi/stock-analyzer-2025/issues/new
   - タイトル: `[Production] <問題の簡潔な説明>`
   - 収集した情報を添付

3. **FMPサポートに問い合わせ**（APIキー関連の場合）
   - support@financialmodelingprep.com
   - APIキーと問題の詳細を記載

## 関連ドキュメント

- [API Not Working Guide](./API_NOT_WORKING.md) - トラブルシューティング全般
- [FMP API Setup Guide](./FMP_API_SETUP.md) - セットアップ方法
- [Screening API Fix](./SCREENING_API_FIX.md) - 最近の修正内容
