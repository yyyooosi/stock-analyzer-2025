# 株価暴落予測アナライザー

リアルタイムの株価データとソーシャルメディアのセンチメント分析を組み合わせた、株価暴落予測システムです。

## 機能

- 📊 **リアルタイム株価データ取得** - Alpha Vantage APIを使用
- 🔍 **全米国株スクリーニング** - Financial Modeling Prep APIで数千銘柄をスクリーニング
- 🐦 **Twitter/Xセンチメント分析** - 暴落関連ツイートの感情分析
- 📈 **インタラクティブチャート** - Chart.jsによる視覚化
- 🔄 **バックテスト機能** - 予測精度の検証
- 🎯 **高度なフィルタリング** - ファンダメンタル、テクニカル、配当など多様な条件
- 🎨 **モダンUI** - Tailwind CSSによる洗練されたデザイン
- 🔒 **セキュア** - APIキーはバックエンドで管理

## 技術スタック

- **フレームワーク**: Next.js 15.4.1 (App Router)
- **言語**: TypeScript
- **スタイリング**: Tailwind CSS
- **チャート**: Chart.js 4.4.0 + react-chartjs-2
- **デプロイ**: Vercel

## セットアップ

### 1. リポジトリのクローン

```bash
git clone https://github.com/your-username/stock-analyzer-2025.git
cd stock-analyzer-2025
```

### 2. 依存関係のインストール

```bash
npm install
```

### 3. 環境変数の設定

`.env.local`ファイルを作成し、APIキーを設定します：

```bash
cp .env.local.example .env.local
```

`.env.local`を編集：

```bash
# Alpha Vantage API Key (株価データ取得用)
ALPHA_VANTAGE_API_KEY=your_alpha_vantage_api_key_here

# Financial Modeling Prep API Key (スクリーナー用 - 推奨)
FMP_API_KEY=your_fmp_api_key_here

# Twitter API Bearer Token (センチメント分析用)
TWITTER_BEARER_TOKEN=your_twitter_bearer_token_here
```

#### APIキーの取得方法

- **Alpha Vantage**: https://www.alphavantage.co/support/#api-key (無料: 25リクエスト/日)
- **Financial Modeling Prep**: https://financialmodelingprep.com/developer/docs (無料: 250リクエスト/日)
- **Twitter API**: https://developer.twitter.com/en/portal/dashboard

**注意**: FMP_API_KEYが設定されていない場合、スクリーナーは15銘柄のサンプルデータで動作します。全米国株（1000+銘柄）をスクリーニングするには、FMP APIキーの設定が必要です。

詳細は [ENVIRONMENT_VARIABLES.md](ENVIRONMENT_VARIABLES.md) を参照してください。

### 4. 開発サーバーの起動

```bash
npm run dev
```

ブラウザで http://localhost:3000 を開いてアプリケーションを確認できます。

## 使い方

1. **株式シンボルを入力** (例: AAPL, MSFT, TSLA)
2. **「実データを使用」トグル**でリアルデータ/デモモードを切り替え
3. **検索ボタン**をクリックして分析開始
4. **暴落予測分析ボタン**でセンチメント分析を実行

## デモモード

APIキーが設定されていない場合、アプリケーションは自動的にデモモードで動作します：

- サンプル株価データを生成
- サンプルツイートを表示
- すべての機能をテスト可能

## プロジェクト構成

```
stock-analyzer-2025/
├── app/
│   ├── api/               # Next.js API Routes
│   │   ├── stock/         # 株価データAPI
│   │   └── twitter/       # Twitter検索API
│   ├── components/        # Reactコンポーネント
│   ├── utils/             # ユーティリティ関数
│   └── page.tsx           # メインページ
├── public/                # 静的ファイル
├── .env.local.example     # 環境変数のテンプレート
└── README.md
```

## API エンドポイント

### 株価データ

- `GET /api/stock/quote?symbol=AAPL` - リアルタイム株価
- `GET /api/stock/timeseries?symbol=AAPL` - 履歴データ

### スクリーナー

- `GET /api/screener?perMin=10&perMax=20&roeMin=15` - 株式スクリーニング
  - FMP APIを使用して全米国株をスクリーニング
  - ファンダメンタル、テクニカル、配当などの条件でフィルタリング
  - スコアリングと順位付け

### Twitter検索

- `GET /api/twitter/search?query=crash&max_results=100` - ツイート検索

## デプロイ

### Vercelへのデプロイ

1. GitHubにプッシュ
2. Vercelでプロジェクトをインポート
3. 環境変数を設定:
   - `ALPHA_VANTAGE_API_KEY` (必須)
   - `FMP_API_KEY` (推奨 - 全米国株スクリーニング用)
   - `TWITTER_BEARER_TOKEN` (オプション)
4. デプロイ完了！

詳細: https://vercel.com/docs

## トラブルシューティング

### Twitter API 401 Unauthorized

Bearer Tokenが無効です。X Developer Portalで以下を確認：
1. アプリがプロジェクト内にあるか
2. Bearer Tokenを再生成
3. 新しいトークンを環境変数に設定

詳細は [X_API_修正手順.md](X_API_修正手順.md) を参照。

### Alpha Vantage Rate Limit

無料プランは1分間に5リクエストまでです。
- 少し待ってから再試行
- デモモードに切り替えてテスト

## ライセンス

MIT License

## 作者

Created with ❤️ using Next.js and Claude Code
