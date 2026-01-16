# Slack 通知統合ガイド

## セットアップ手順

### 1. Slack Webhook URL の設定

`.env.local` ファイルに以下を追加してください：

```env
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/YOUR/WEBHOOK/URL
SLACK_ENABLED=true
```

**Webhook URL の取得方法:**
1. Slack ワークスペースにアクセス
2. https://api.slack.com/messaging/webhooks を訪問
3. "Create New App" → "From scratch" を選択
4. Incoming Webhooks を有効化
5. "Add New Webhook to Workspace" をクリック
6. 通知対象のチャネルを選択
7. 生成されたWebhook URL をコピー

### 2. API エンドポイント

#### リスク監視 API （自動通知付き）
```bash
GET /api/risk-monitor
```

レスポンス例：
```json
{
  "success": true,
  "data": {
    "timestamp": "2026-01-16T...",
    "overallScore": 65.0,
    "riskLevel": "elevated",
    "categories": [...],
    "alerts": ["⚠️ Market risk elevated - consider defensive positioning"]
  },
  "notifications": {
    "slack": true,
    "discord": false,
    "sent": true
  }
}
```

#### テスト通知 API
```bash
POST /api/notifications/test
```

このエンドポイントは、Slack/Discord/Email の全チャネルにテスト通知を送信します。

#### 通知履歴 API
```bash
GET /api/notifications/history?limit=100
```

### 3. 通知が送信される条件

| 条件 | 説明 |
|------|------|
| **リスクスコア** | ≥ 60 のときのみ通知送信 |
| **高リスク (≥80)** | 30分ごとに通知 |
| **中リスク (70-80)** | 45分ごとに通知 |
| **標準リスク (60-70)** | 60分ごとに通知 |

### 4. Slack メッセージフォーマット

```
📊 Market Risk Alert - Score: 65.0/100

Risk Level: ELEVATED

Overall Score: 65.0/100
Top Warning: Valuation Concern  
Dot-Com Similarity: 72.5%
2008 Crisis Similarity: 68.3%

Footer: Stock Analyzer Risk Monitor
```

## トラブルシューティング

### 通知が送信されない場合

1. **Webhook URL の確認**
   ```bash
   echo $SLACK_WEBHOOK_URL
   ```

2. **Webhook のテスト**
   ```bash
   curl -X POST \
     -H 'Content-type: application/json' \
     --data '{"text":"Test message"}' \
     YOUR_WEBHOOK_URL
   ```

3. **ログの確認**
   ```bash
   npm run dev
   # コンソールで "SLACK_WEBHOOK_URL not configured" が出ないか確認
   ```

4. **リスクスコアの確認**
   - リスクスコアが 60 未満の場合、通知は送信されません
   - `/api/risk-monitor` エンドポイントで現在のスコアを確認してください

### Webhook URL が無効な場合

- Webhook URL を再度作成してください
- https://api.slack.com/messaging/webhooks を訪問
- Slack ワークスペースで新しい Incoming Webhook を作成

## 実装コードの場所

- **通知ロジック**: `app/utils/notifications.ts`
- **API エンドポイント**: `app/api/risk-monitor/route.ts`
- **テスト通知**: `app/api/notifications/test/route.ts`

## 機能詳細

### 自動通知メカニズム

```javascript
// /api/risk-monitor へのアクセス時に自動実行
if (shouldSendNotification(overallScore, lastNotificationTime)) {
  await sendSlackNotification(assessment);
  await sendDiscordNotification(assessment);
}
```

### 通知履歴

最新 100 件の通知記録が記録されます。

```bash
GET /api/notifications/history
# または
GET /api/notifications/history?limit=50
```

## 今後の拡張

- [ ] メール通知の実装
- [ ] カスタム通知フィルター
- [ ] Slack スレッドでの詳細レポート
- [ ] 定期的な Cron ジョブ実行

