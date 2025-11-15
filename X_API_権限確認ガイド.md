# X API 403エラー - アプリ設定確認ガイド

## 現在の状況

新しいBearer Tokenで403エラーが継続中。
Free tierでRecent Searchは**利用可能**ですが、アプリの権限設定を確認する必要があります。

---

## 🔍 今すぐ確認してください

### ステップ1: X Developer Portalにアクセス

https://developer.twitter.com/en/portal/dashboard

### ステップ2: アプリの権限（Permissions）を確認

1. **プロジェクトを選択** → **あなたのアプリを選択**

2. **「Settings」タブ**をクリック

3. **「User authentication settings」**を確認

#### 確認ポイント：

**App permissions（アプリ権限）** が以下のいずれかになっているか？

- ✅ **Read** - 読み取り専用（これが必要！）
- ✅ **Read and Write** - 読み書き可能（これでもOK）
- ❌ **Write** - 書き込みのみ（これだと403エラーになる）

**もし "Write" のみの場合**: **"Read and Write"** に変更してください

### ステップ3: Type of App を確認

**Type of App** が以下のいずれかになっているか？

- ✅ **Web App, Automated App or Bot** - 推奨
- ✅ **Native App**
- ❌ 設定されていない

**もし設定されていない場合**:
- **「Set up」**ボタンをクリック
- **Type of App**: `Web App, Automated App or Bot` を選択
- **App permissions**: `Read and Write` を選択
- **Callback URI**: `https://stock-analyzer-2025-huzw.vercel.app/` を入力
- **Website URL**: `https://stock-analyzer-2025-huzw.vercel.app/` を入力

### ステップ4: 設定を保存したら Bearer Token を再生成

**重要**: 権限を変更した後は、必ずBearer Tokenを再生成してください

1. アプリ → **「Keys and tokens」**タブ
2. **「Bearer Token」** → **「Regenerate」**
3. 新しいトークンをコピー

---

## 📋 チェックリスト

以下を確認してください：

- [ ] アプリはプロジェクトの中にある
- [ ] App permissions が **"Read"** または **"Read and Write"**
- [ ] User authentication settings が設定されている
- [ ] 設定変更後に Bearer Token を再生成した
- [ ] 新しいトークンを正確にコピーした（前後にスペースなし）

---

## 🧪 確認方法

X Developer Portalで上記を確認後、新しいBearer Tokenを提供してください。

以下のコマンドでテストできます：

```bash
bash /tmp/update_token.sh YOUR_NEW_BEARER_TOKEN
```

---

## 💡 Free Tier の制限

**確認**: あなたのプランは本当に "Free" ですか？

Free tierでは：
- ✅ Recent Search: **利用可能** （15分に1回）
- ✅ Tweet投稿: 月1,500ツイートまで
- ✅ User lookup: 利用可能

**もし403が続く場合の可能性**:

1. **Write-only access**: アプリ権限が "Write" のみになっている
2. **User authentication未設定**: OAuth設定が必要なエンドポイント
3. **Basic tier が必要**: 一部のエンドポイントはBasic tier以上が必要

---

## 🔄 代替案：OAuth 1.0a を使用

もしBearer Tokenで解決しない場合、OAuth 1.0a（User Context）を使う方法もあります：

**必要な情報**:
- API Key (Consumer Key)
- API Key Secret (Consumer Secret)
- Access Token
- Access Token Secret

これらは「Keys and tokens」タブで取得できます。

OAuth 1.0aの方が、より多くのエンドポイントにアクセスできます。

---

## 📞 次のステップ

1. ✅ X Developer Portalで権限を確認
2. 📝 以下の情報を教えてください：
   - App permissions: `Read` / `Write` / `Read and Write` のどれ？
   - User authentication settings: 設定済み / 未設定？
   - Access level: `Free` / `Basic` / `Pro` のどれ？
3. 🔄 設定を変更した場合は、新しいBearer Tokenを再生成して提供

---

## 🎯 ゴール

アプリ設定が正しければ、診断スクリプトで：
- ✅ Test 1: HTTP 200 または 429（トークン有効の証）
- ✅ Test 2: HTTP 200 または 429

429（Rate Limited）が出れば、それはトークンが**有効**という証拠です！
（15分に1回の制限に達したため）
