# FMP API接続エラーの徹底調査

## 🔍 現在の状況

✅ コードはmainブランチにマージ済み (コミット: 9f6664f)
❌ スクリーナーで「検索結果 (0件)」が表示される

## 📊 原因の特定方法

### ステップ1: Vercelデプロイログを確認

1. **Vercel Dashboardにアクセス**
   - https://vercel.com/dashboard

2. **プロジェクトを選択**
   - `stock-analyzer-2025` をクリック

3. **Deployments タブ**
   - 最新のデプロイを選択（緑色のチェックマーク）

4. **"Building" セクションを確認**
   - ビルドログで環境変数の警告を確認:
     ```
     ⚠️ Warning: FMP_API_KEY is not set
     ```

### ステップ2: Function実行ログを確認（最重要）

1. **Deploymentsタブ** → 最新デプロイをクリック

2. **"Functions" タブ**をクリック

3. **`/api/screener`** を選択

4. **"Logs"** を確認

#### 期待されるログ（正常時）:
```
[Screener] Starting stock data fetch...
[Screener] Fetching stocks from FMP API...
[FMP] Fetching comprehensive stock data...
[FMP] Fetching stock screener: https://financialmodelingprep.com/api/v3/stock-screener?...
[FMP] Got 1000 stocks from screener
[Screener] FMP API returned 500 valid stocks
```

#### エラーパターン1: APIキー未設定
```
Error: FMP_API_KEY is not configured. Please set the environment variable.
```
**対処法**: 環境変数を設定してRedeploy

#### エラーパターン2: API接続失敗
```
[FMP] Stock screener error: TypeError: fetch failed
```
**対処法**: APIキーの有効性を確認

#### エラーパターン3: 403 Forbidden
```
[FMP] Stock screener error: FMP API returned status 403
```
**対処法**: APIキーが無効または期限切れ

#### エラーパターン4: データなし
```
[FMP] Got 0 stocks from screener
[Screener] No stocks found from FMP API
```
**対処法**: スクリーナーパラメータを確認

### ステップ3: 環境変数を再確認

1. **Vercel Dashboard** → **Settings** → **Environment Variables**

2. 以下を確認:
   ```
   Name: FMP_API_KEY
   Value: f3FJh2JitCLnTYOl9iVSVAe6v9SekGdy
   Environments:
     ✅ Production
     ✅ Preview
     ✅ Development
   ```

3. **重要**: 環境変数を追加・変更した場合は必ず **Redeploy**

### ステップ4: APIキーの有効性をテスト

ブラウザで以下のURLを開いて、APIキーが有効か確認:

```
https://financialmodelingprep.com/api/v3/stock-screener?limit=5&apikey=f3FJh2JitCLnTYOl9iVSVAe6v9SekGdy
```

#### 期待される結果（正常時）:
```json
[
  {
    "symbol": "AAPL",
    "companyName": "Apple Inc.",
    "marketCap": 3000000000000,
    "sector": "Technology",
    ...
  },
  ...
]
```

#### エラー（APIキー無効時）:
```json
{
  "Error Message": "Invalid API KEY. Please retry or visit our documentation to create one FREE https://financialmodelingprep.com/developer/docs"
}
```

## 🔧 問題別の対処法

### Case 1: 環境変数が設定されていない

**症状**: ログに "FMP_API_KEY is not configured" が出る

**対処法**:
1. Vercel → Settings → Environment Variables
2. `FMP_API_KEY` を追加
3. Production, Preview, Development全てにチェック
4. **Save** → **Deployments** → **Redeploy**

### Case 2: APIキーが無効

**症状**: ブラウザテストで "Invalid API KEY" エラー

**対処法**:
1. https://financialmodelingprep.com/developer/docs にアクセス
2. 新しいAPIキーを生成
3. Vercel環境変数を更新
4. Redeploy

### Case 3: 環境変数を追加したがRedeployしていない

**症状**: 環境変数は設定されているが、ログに "not configured" が出る

**対処法**:
1. Deployments タブ
2. 最新デプロイの "..." メニュー
3. "Redeploy" をクリック

### Case 4: スクリーナーパラメータが厳しすぎる

**症状**: ログに "Got 0 stocks from screener" が出る

**対処法**:
1. プリセットの「成長株」を選択
2. フィルターをクリア
3. 再度検索

## 🎯 デバッグ用テストAPI

デプロイ先のURLで以下をテスト:

```bash
# 環境変数確認用（環境変数名のみ表示）
curl "https://your-app.vercel.app/api/check-env"

# スクリーナーAPI直接テスト
curl "https://your-app.vercel.app/api/screener" | jq '.error, .count'
```

## 📝 報告すべき情報

以下の情報を確認してください:

1. ✅ Vercel Function Logsのエラーメッセージ
2. ✅ 環境変数の設定状況（値は伏せてOK）
3. ✅ ブラウザでのAPIキーテスト結果
4. ✅ 最新デプロイのタイムスタンプ

これらの情報で原因を特定できます。

## 🚨 最も可能性が高い原因

**環境変数を追加したがRedeployしていない**

Vercelは環境変数を追加・変更しても、既存のデプロイには反映されません。
必ず **Redeploy** を実行してください。

### Redeploy手順:
1. Vercel Dashboard
2. Deployments タブ
3. 一番上のデプロイの "..." (3点メニュー)
4. "Redeploy" をクリック
5. "Redeploy" ボタンをクリックして確定
6. デプロイ完了を待つ（1-2分）
7. スクリーナー画面をリロード
