# 🔴 X API 403エラーの修正手順

## 現在の状況

診断結果：
- ✅ Bearer Tokenの形式は正しい（116文字）
- ❌ すべてのエンドポイントで403エラー
- 🔍 **原因**：アプリがプロジェクト内に正しく配置されていない

## 今すぐやること（5分で完了）

### ステップ1: X Developer Portalにアクセス

https://developer.twitter.com/en/portal/dashboard

### ステップ2: アプリの場所を確認

左サイドバーの「Projects & Apps」を見てください：

**質問**: アプリは **プロジェクトの中** にありますか？

#### パターンA: スタンドアロンアプリ（プロジェクト外）
```
❌ 現状（動かない）:
   Apps
   └── my-app (スタンドアロン)

✅ 正しい状態（動く）:
   Projects
   └── Stock Analyzer Project
       └── my-app
```

→ **新しいプロジェクトを作成してアプリを追加する必要があります**

#### パターンB: すでにプロジェクト内
```
✅ Projects
   └── My Project
       └── my-app
```

→ **トークンを再生成するだけでOK（ステップ4へ）**

### ステップ3: プロジェクトを作成（必要な場合）

1. **「+ Create Project」をクリック**

2. **プロジェクト情報を入力**:
   - プロジェクト名: `Stock Analyzer Project`
   - 用途: `Making a bot` または `Exploring the API`
   - 説明: `株価暴落予測システム`

3. **既存のアプリを追加 または 新規作成**:
   - 既存のアプリがあれば選択
   - なければ新規作成

4. **完了まで進む**

### ステップ4: Bearer Tokenを再生成

**重要**: プロジェクトにアプリを追加した後は、必ずトークンを再生成してください

1. **アプリの設定 → 「Keys and tokens」タブ**

2. **「Bearer Token」セクションを見つける**

3. **「Regenerate」ボタンをクリック**

4. **新しいトークンをコピー**
   - 形式: `AAAAAAAAAAAAAAAAAAAAAxxxxxx...`
   - 長さ: 約115文字
   - ⚠️ 一度しか表示されないので、必ずコピーしてください！

### ステップ5: トークンを更新

**簡単な方法（推奨）**:

```bash
bash /tmp/update_token.sh YOUR_NEW_BEARER_TOKEN
```

このスクリプトが自動で：
- トークンを検証
- .env.localをバックアップ
- 新しいトークンに更新
- テストを実行

**手動の方法**:

`.env.local`ファイルを編集：
```bash
TWITTER_BEARER_TOKEN=YOUR_NEW_BEARER_TOKEN_HERE
```

**注意**: 以前は `NEXT_PUBLIC_TWITTER_BEARER_TOKEN` でしたが、セキュリティ向上のため `TWITTER_BEARER_TOKEN`（プレフィックスなし）に変更されました。

### ステップ6: テスト

```bash
bash /tmp/diagnose_x_api.sh
```

**期待される結果**: ✅ SUCCESS!

## Freeプランで使える機能

修正後、以下が使えます：
- ✅ Recent Search（15分に1回）
- ✅ 1回100ツイートまで取得
- ✅ 月1,500ツイート投稿

**あなたのユースケース**:
- 15分ごとに分析可能（1日96回）
- 1回100ツイート取得
- 1日最大9,600ツイート分析可能

十分な量です！

## 修正完了後の手順

1. ✅ ローカルでテストして動作確認

2. **Vercelの環境変数を更新**:
   - https://vercel.com/yyoos-projects/stock-analyzer-2025-huzw/settings/environment-variables
   - `TWITTER_BEARER_TOKEN` を新しい値に更新
   - **注意**: 古い `NEXT_PUBLIC_TWITTER_BEARER_TOKEN` があれば削除してください

3. **再デプロイ**（Gitにpushすれば自動デプロイ）

4. **アプリで確認**:
   - https://stock-analyzer-2025-huzw.vercel.app/
   - 「実データを使用」をONにする
   - 実際のツイートが表示される！🎉

## デモモードを使う（修正中の代替手段）

APIを修正している間は、デモモードが使えます：

1. アプリにアクセス
2. 「実データを使用」をOFF
3. サンプルツイートで分析をテスト

UIと分析機能は完璧に動きます！

## よくある質問

### Q: Bearer Tokenはどこにありますか？
A: アプリの「Keys and tokens」タブ → 「Bearer Token」セクション

### Q: API KeyとBearer Tokenの違いは？
A:
- **API Key** (Consumer Key): 短い、OAuth 1.0a用
- **Bearer Token**: 長い（~115文字）、OAuth 2.0用 ← これが必要

### Q: 電話番号の認証が求められます
A: X APIを使うには電話番号認証が必要です。追加して認証してください。

### Q: Elevatedアクセスは必要ですか？
A: Recent Search（最近の検索）は **Free tier** で使えます！
   Elevatedアクセスは不要です。

### Q: まだ403エラーが出ます
A: チェックリスト：
- [ ] アプリはプロジェクトの中にある？
- [ ] プロジェクトに追加した**後**にトークンを再生成した？
- [ ] Bearer Token（長いやつ）をコピーした？
- [ ] アプリのPermissionsが「Read」になっている？

## トラブルシューティング

### 診断ツールを実行
```bash
bash /tmp/diagnose_x_api.sh
```

### トークン更新ツールを使用
```bash
bash /tmp/update_token.sh YOUR_NEW_TOKEN
```

### 詳細ガイドを読む
```bash
cat /home/user/stock-analyzer-2025/X_API_SETUP_GUIDE.md
```

## まとめ

| 項目 | 内容 |
|------|------|
| 🔴 問題 | アプリがプロジェクト外 → Bearer Token動かず |
| ✅ 解決策 | プロジェクトにアプリ追加 → トークン再生成 |
| ⏱️ 所要時間 | 約5分 |
| 🎯 ゴール | 診断スクリプトで ✅ SUCCESS と表示される |

## 次のアクション

1. **今すぐ**: X Developer Portalでプロジェクトを確認
2. **5分後**: 新しいトークンで動作確認
3. **10分後**: Vercelにデプロイして本番で確認

頑張ってください！🚀
