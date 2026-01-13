# スクリーニングAPI修正 - 2026-01-13

## 問題の概要

スクリーニングAPIが、FMP APIから取得したデータを十分に活用できていませんでした。

### 発見された問題

1. **データ損失**: FMP Quote APIから取得した有用なデータ（PER, SMA50, SMA200など）を破棄していた
2. **不完全なマッピング**: `FMPCombinedStockData` 型が quote データを保持していなかった
3. **機能不全**: ほとんどのファンダメンタルズデータが `null` になり、フィルタリングが機能しなかった

## 修正内容

### 1. `FMPCombinedStockData` インターフェースの拡張

**ファイル**: `app/utils/fmpApi.ts:547-552`

```typescript
export interface FMPCombinedStockData {
  screener: FMPStockScreenerResult;
  quote?: FMPQuote; // 追加: PE, SMA, 52週高値などのメトリクス
  keyMetrics?: FMPKeyMetrics;
  ratios?: FMPFinancialRatios;
}
```

### 2. Quote データの保存

**ファイル**: `app/utils/fmpApi.ts`

`fetchFMPComprehensiveStockData` 関数を修正:
- Quote データを `Map` に保存（行631-633）
- `fetchDetailedData = false` の場合も quote データを返す（行690-695）
- `fetchDetailedData = true` の場合も quote データを含める（行721）

### 3. データマッピングの改善

**ファイル**: `app/utils/fmpMapper.ts`

`mapFMPDataToStockFundamentals` 関数で、quote データから以下を取得:

| フィールド | ソース | 説明 |
|----------|--------|------|
| `change` | `quote.change` | 当日の価格変動 |
| `changePercent` | `quote.changesPercentage` | 当日の変動率 (%) |
| `per` | `quote.pe` | 株価収益率 (P/E ratio) |
| `sma50` | `quote.priceAvg50` | 50日移動平均 |
| `sma200` | `quote.priceAvg200` | 200日移動平均 |
| `volumeChange` | 計算: `(quote.volume - quote.avgVolume) / quote.avgVolume * 100` | 出来高変化率 (%) |
| `week52High` | `quote.yearHigh` | 52週高値 |
| `week52HighDistance` | 計算: `(quote.price - quote.yearHigh) / quote.yearHigh * 100` | 52週高値からの距離 (%) |

## 取得できるようになったデータ

### バリュエーション指標
- ✅ **PER (P/E ratio)**: 割安株スクリーニングに必須
- ✅ **時価総額**: 企業規模でのフィルタリング
- ✅ **価格**: 価格帯でのフィルタリング

### テクニカル指標
- ✅ **50日移動平均 (SMA50)**: 短期トレンド分析
- ✅ **200日移動平均 (SMA200)**: 長期トレンド分析
- ✅ **52週高値との距離**: モメンタム分析
- ✅ **出来高変化率**: 市場の関心度

### 価格データ
- ✅ **当日変動**: リアルタイム値動き
- ✅ **変動率**: パーセンテージ表示

## API効率性の向上

### 修正前
- Quote APIからPER, SMAなどを取得
- **これらのデータを破棄**
- Key Metrics API と Ratios API を個別に呼び出す必要がある
- 1000銘柄の場合: **最大3000リクエスト** (無料プラン250リクエスト/日を大幅超過)

### 修正後
- Quote APIからPER, SMAなどを取得
- **これらのデータを活用**
- 基本的なスクリーニングには追加APIコール不要
- 1000銘柄の場合: **約10リクエスト** (100銘柄ずつバッチ処理)

**API呼び出し削減**: 約 **99.7%減**

## 動作確認

### テスト可能なフィルター

修正により、以下のフィルターが正常に機能するようになりました:

1. **PERフィルター** (`perMin`, `perMax`)
2. **SMA200以上** (`aboveSMA200`)
3. **SMA50以上** (`aboveSMA50`)
4. **ゴールデンクロス** (`goldenCross`: SMA50 > SMA200)
5. **52週高値からの距離** (`week52HighDistanceMax`)
6. **出来高増加率** (`volumeIncreasePercent`)
7. **時価総額** (`marketCapMin`, `marketCapMax`)

### まだ取得できないデータ

以下のデータは、追加のAPI呼び出しが必要です（Key Metrics / Ratios API）:

- PBR (株価純資産倍率)
- ROE (自己資本利益率)
- 各種財務比率
- EPS成長率（過去データが必要）
- 配当連続年数

これらが必要な場合は、`fetchDetailedData = true` を設定しますが、API呼び出しが大幅に増加します。

## 影響範囲

### 修正されたファイル
1. `app/utils/fmpApi.ts` - Quote データの保存とインターフェース拡張
2. `app/utils/fmpMapper.ts` - Quote データの活用

### 影響を受けないファイル
- `app/api/screener/route.ts` - 変更不要（既存のAPIコールがそのまま動作）
- `app/utils/screener.ts` - 変更不要（フィルタリングロジックは同じ）
- `app/screener/page.tsx` - 変更不要（UIは同じ）

## まとめ

この修正により、FMP APIの無料プランでも効果的な株式スクリーニングが可能になりました。

- **API効率**: 99.7%の削減
- **機能**: 基本的なスクリーニングに必要なデータを取得
- **コスト**: 無料プランの制限内で動作
