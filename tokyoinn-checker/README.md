# 東横イン空室チェッカー（GAS / clasp 管理）

東横インの予約ページを定期的にチェックし、空室が出たらメール通知する
Google Apps Script (GAS) 製の Web アプリです。
このディレクトリは [clasp](https://github.com/google/clasp) でソース管理し、
GitHub Actions で Apps Script へ自動デプロイできるよう構成しています。

> このフォルダは「独立リポジトリのルート」として置けるように作ってあります。
> 別リポジトリに移す場合は `tokyoinn-checker/` の中身をそのままルートに置いてください。

## ディレクトリ構成

```
.
├── src/
│   ├── Code.js          # GAS 本体
│   ├── appsscript.json  # マニフェスト（Webアプリ設定・スコープ）
│   └── index.html       # WebアプリのUI（※別途追加してください）
├── .clasp.json.example  # scriptId のテンプレート（コピーして .clasp.json を作る）
├── .github/workflows/clasp-deploy.yml  # 自動デプロイ
├── package.json
└── README.md
```

> **index.html はこのリポジトリに含まれていません。** お手元 / 既存プロジェクトの
> `index.html` を `src/` に追加してから push/deploy してください。

---

## 複数アカウント対応について（重要）

「メールアドレスを登録すると全員のが書き換わってしまう」問題の原因と対策です。

- 設定データ（`urls` / `email` / `hotelInfo` / `checkHistory`）はコード上すでに
  `PropertiesService.getUserProperties()` に保存しており、**本来はユーザーごとに
  分離されます**。
- ところが Web アプリのデプロイ設定が **「自分（オーナー）として実行」** になっていると、
  誰がアクセスしても処理がオーナー権限で動くため、`getUserProperties()` が
  **常にオーナーのデータ**を返し、全員で共有・上書きされてしまいます。

### 対策

`src/appsscript.json` に以下を設定済みです（このリポジトリの構成で反映されます）:

```json
"webapp": {
  "executeAs": "USER_ACCESSING",
  "access": "ANYONE"
}
```

- `executeAs: USER_ACCESSING` … **アクセスしているユーザー自身として実行**。
  これにより各ユーザーの `getUserProperties()` が分離され、メール登録や監視URLが
  個人ごとに保持されます。
- `access: ANYONE` … Google アカウントを持つ全員が利用可能（従来どおり）。

> デプロイ時、Apps Script 側の「ウェブアプリ」設定でも
> 「次のユーザーとして実行: **ウェブアプリケーションにアクセスしているユーザー**」
> になっていることを確認してください。clasp/マニフェストの値が優先されますが、
> 手動デプロイ時の取り違えに注意。
>
> 注意: `USER_ACCESSING` では各ユーザーが初回アクセス時に OAuth 認可
> （メール送信・外部リクエスト等）に同意する必要があります。

時間トリガー（定期チェック）も `ScriptApp` のトリガーは作成ユーザーごとに
管理されるため、ユーザー単位で正しく動作します。

---

## セットアップ

### 1. clasp のインストールとログイン（ローカル）

```bash
npm install
npx clasp login
```

### 2. スクリプトと紐付け

既存の Apps Script プロジェクトを使う場合:

```bash
cp .clasp.json.example .clasp.json
# .clasp.json の scriptId を実際のスクリプトIDに書き換える
```

新規作成する場合:

```bash
npx clasp create --type webapp --title "東横イン空室チェッカー" --rootDir src
```

スクリプトIDは Apps Script エディタ →「プロジェクトの設定」→「スクリプトID」で確認できます。

### 3. スクリプトプロパティ（共有設定）

Apps Script エディタ →「プロジェクトの設定」→「スクリプトプロパティ」で設定:

| キー | 内容 |
| --- | --- |
| `CLOUD_FUNCTION_URL` | レンダリング用 Cloud Function のエンドポイント URL |
| `CLOUD_FUNCTION_API_KEY` | その API キー |

これらは全ユーザー共有のレンダリングサービス設定なので ScriptProperties で管理します。

### 4. 手動デプロイ

```bash
npm run deploy   # clasp push -f && clasp deploy
```

---

## GitHub Actions による自動デプロイ

`main` ブランチへ push すると `.github/workflows/clasp-deploy.yml` が
`clasp push` + `clasp deploy` を実行します。

### 必要な GitHub Secrets

リポジトリの Settings → Secrets and variables → Actions で登録:

| Secret 名 | 値 |
| --- | --- |
| `CLASPRC_JSON` | ローカルの `~/.clasprc.json` の中身まるごと（`clasp login` 後に生成される） |
| `SCRIPT_ID` | 対象スクリプトのスクリプトID |

> `~/.clasprc.json` には OAuth リフレッシュトークンが含まれます。**絶対にコミットせず**、
> Secret としてのみ登録してください（`.gitignore` 済み）。
> トークンの有効期限切れで失敗する場合は、ローカルで `clasp login` をやり直し、
> 新しい `~/.clasprc.json` の内容で Secret を更新してください。

---

## ローカル開発フロー

```bash
npx clasp pull   # リモートの最新を取得
# src/ を編集
npx clasp push   # リモートへ反映
```
