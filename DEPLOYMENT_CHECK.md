# デプロイ確認チェックリスト

## Vercel環境変数の設定状況を確認してください

### 確認手順:

1. **Vercel Dashboardにアクセス**
   - https://vercel.com/dashboard

2. **プロジェクトを選択**
   - `stock-analyzer-2025` を選択

3. **Settings → Environment Variables**
   - `FMP_API_KEY` が設定されているか確認
   - 値: `f3FJh2JitCLnTYOl9iVSVAe6v9SekGdy`
   - Environment: `Production`, `Preview`, `Development` すべてにチェック

4. **環境変数追加後は必ずRedeploy**
   - Deployments タブ → 最新デプロイの「...」メニュー → "Redeploy"

## デプロイログの確認方法

### FMP APIが呼ばれているか確認:

1. **Vercel Dashboard → Deployments**
2. 最新のデプロイを選択
3. **Functions タブ**
4. `/api/screener` を選択
5. **Logs** を確認

### 期待されるログ（FMP API使用時）:
```
[Screener] Starting stock data fetch...
[Screener] Fetching stocks from FMP API...
[FMP] Fetching comprehensive stock data...
[FMP] Got 1000 stocks from screener
[Screener] Using FMP API data (1000 stocks)
```

### サンプルデータ使用時のログ:
```
[Screener] FMP API key not configured
[Screener] FMP API unavailable, using sample data
```

## 問題の切り分け

### ケース1: 環境変数が未設定
**症状**: ログに "FMP API key not configured" が出る
**対処**: Vercel環境変数に `FMP_API_KEY` を追加してRedeploy

### ケース2: API接続エラー
**症状**: ログに "FMP Stock screener error: 403" や "fetch failed" が出る
**対処**: APIキーが正しいか確認、またはFMPアカウントを確認

### ケース3: mainブランチに反映されていない
**症状**: デプロイは成功しているが、新しいコードが反映されていない
**対処**: mainブランチにマージされているか確認

## 現在の状況

- ✅ コード実装完了
- ✅ TypeScriptビルド成功
- ✅ feature branchにプッシュ済み
- ❓ mainブランチにマージ済み？
- ❓ Vercel環境変数設定済み？
- ❓ Redeploy実施済み？

## 次のアクション

1. [ ] Vercel環境変数 `FMP_API_KEY` を設定
2. [ ] Redeployを実施
3. [ ] デプロイログでFMP API呼び出しを確認
4. [ ] スクリーナー画面で1000銘柄表示を確認
