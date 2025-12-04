// 履歴パターン分析ユーティリティ

interface PriceData {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

interface IndicatorSnapshot {
  date: string;
  price: number;
  rsi: number;
  macd: number;
  macdSignal: number;
  macdHistogram: number;
  sma5: number;
  sma20: number;
  sma50: number;
  bollingerUpper: number;
  bollingerMiddle: number;
  bollingerLower: number;
  ema12: number;
  ema26: number;
}

interface SimilarPattern {
  date: string;
  similarity: number;
  indicators: IndicatorSnapshot;
  futurePerformance: {
    days: number;
    priceChange: number;
    priceChangePercent: number;
    highestPrice: number;
    lowestPrice: number;
    volatility: number;
  }[];
}

interface PatternAnalysisResult {
  currentIndicators: IndicatorSnapshot;
  similarPatterns: SimilarPattern[];
  prediction: {
    averageReturn1Day: number;
    averageReturn3Day: number;
    averageReturn5Day: number;
    averageReturn7Day: number;
    successRate: number; // 上昇した確率
    confidence: number; // 信頼度（類似パターン数に基づく）
    volatilityExpectation: number; // 期待されるボラティリティ
  };
  summary: string;
}

/**
 * 2つの数値の類似度を計算（0-100）
 * 値が近いほど100に近くなる
 */
function calculateSimilarity(value1: number, value2: number, tolerance: number = 0.1): number {
  if (isNaN(value1) || isNaN(value2)) return 0;

  const diff = Math.abs(value1 - value2);
  const avg = (Math.abs(value1) + Math.abs(value2)) / 2;

  if (avg === 0) return 100; // 両方0の場合は完全一致

  const relativeDiff = diff / avg;
  const similarity = Math.max(0, 100 * (1 - relativeDiff / tolerance));

  return similarity;
}

/**
 * 2つの指標セットの総合類似度を計算
 */
function calculateOverallSimilarity(
  current: Partial<IndicatorSnapshot>,
  historical: Partial<IndicatorSnapshot>
): number {
  const weights = {
    rsi: 0.20,        // RSIは重要な指標
    macd: 0.15,
    macdHistogram: 0.15,
    sma5: 0.10,
    sma20: 0.10,
    sma50: 0.10,
    ema12: 0.10,
    ema26: 0.10
  };

  let totalSimilarity = 0;
  let totalWeight = 0;

  // RSI類似度
  if (current.rsi !== undefined && historical.rsi !== undefined) {
    totalSimilarity += calculateSimilarity(current.rsi, historical.rsi, 0.2) * weights.rsi;
    totalWeight += weights.rsi;
  }

  // MACD類似度
  if (current.macd !== undefined && historical.macd !== undefined) {
    totalSimilarity += calculateSimilarity(current.macd, historical.macd, 0.3) * weights.macd;
    totalWeight += weights.macd;
  }

  // MACDヒストグラム類似度
  if (current.macdHistogram !== undefined && historical.macdHistogram !== undefined) {
    totalSimilarity += calculateSimilarity(current.macdHistogram, historical.macdHistogram, 0.3) * weights.macdHistogram;
    totalWeight += weights.macdHistogram;
  }

  // 移動平均の相対位置（価格との比率）
  if (current.price && historical.price) {
    if (current.sma5 && historical.sma5) {
      const currentRatio = current.price / current.sma5;
      const historicalRatio = historical.price / historical.sma5;
      totalSimilarity += calculateSimilarity(currentRatio, historicalRatio, 0.1) * weights.sma5;
      totalWeight += weights.sma5;
    }

    if (current.sma20 && historical.sma20) {
      const currentRatio = current.price / current.sma20;
      const historicalRatio = historical.price / historical.sma20;
      totalSimilarity += calculateSimilarity(currentRatio, historicalRatio, 0.1) * weights.sma20;
      totalWeight += weights.sma20;
    }

    if (current.sma50 && historical.sma50) {
      const currentRatio = current.price / current.sma50;
      const historicalRatio = historical.price / historical.sma50;
      totalSimilarity += calculateSimilarity(currentRatio, historicalRatio, 0.1) * weights.sma50;
      totalWeight += weights.sma50;
    }

    if (current.ema12 && historical.ema12) {
      const currentRatio = current.price / current.ema12;
      const historicalRatio = historical.price / historical.ema12;
      totalSimilarity += calculateSimilarity(currentRatio, historicalRatio, 0.1) * weights.ema12;
      totalWeight += weights.ema12;
    }

    if (current.ema26 && historical.ema26) {
      const currentRatio = current.price / current.ema26;
      const historicalRatio = historical.price / historical.ema26;
      totalSimilarity += calculateSimilarity(currentRatio, historicalRatio, 0.1) * weights.ema26;
      totalWeight += weights.ema26;
    }
  }

  return totalWeight > 0 ? totalSimilarity / totalWeight : 0;
}

/**
 * 将来のパフォーマンスを計算
 */
function calculateFuturePerformance(
  priceData: PriceData[],
  currentIndex: number,
  periods: number[] = [1, 3, 5, 7]
): SimilarPattern['futurePerformance'] {
  const currentPrice = priceData[currentIndex].close;
  const results: SimilarPattern['futurePerformance'] = [];

  for (const days of periods) {
    const futureIndex = currentIndex + days;

    if (futureIndex >= priceData.length) {
      continue; // データが不足している場合はスキップ
    }

    const futurePrice = priceData[futureIndex].close;
    const priceChange = futurePrice - currentPrice;
    const priceChangePercent = (priceChange / currentPrice) * 100;

    // 期間中の最高値と最安値を計算
    let highestPrice = currentPrice;
    let lowestPrice = currentPrice;
    const pricesInPeriod: number[] = [];

    for (let i = currentIndex; i <= futureIndex && i < priceData.length; i++) {
      highestPrice = Math.max(highestPrice, priceData[i].high);
      lowestPrice = Math.min(lowestPrice, priceData[i].low);
      pricesInPeriod.push(priceData[i].close);
    }

    // ボラティリティ計算（標準偏差）
    const mean = pricesInPeriod.reduce((a, b) => a + b, 0) / pricesInPeriod.length;
    const variance = pricesInPeriod.reduce((sum, price) => sum + Math.pow(price - mean, 2), 0) / pricesInPeriod.length;
    const volatility = Math.sqrt(variance) / currentPrice * 100; // パーセントで表示

    results.push({
      days,
      priceChange,
      priceChangePercent,
      highestPrice,
      lowestPrice,
      volatility
    });
  }

  return results;
}

/**
 * 履歴データから類似パターンを検索
 */
export function findSimilarPatterns(
  priceData: PriceData[],
  indicators: {
    rsi: number[];
    macd: { macd: number[]; signal: number[]; histogram: number[] };
    sma: { sma5: number[]; sma20: number[]; sma50: number[] };
    ema: { ema12: number[]; ema26: number[] };
    bollingerBands: { upper: number[]; middle: number[]; lower: number[] };
  },
  minSimilarity: number = 70 // 最低類似度（0-100）
): PatternAnalysisResult {
  // 最新の指標を取得
  const currentIndex = priceData.length - 1;
  const currentIndicators: IndicatorSnapshot = {
    date: priceData[currentIndex].date,
    price: priceData[currentIndex].close,
    rsi: indicators.rsi[currentIndex],
    macd: indicators.macd.macd[currentIndex],
    macdSignal: indicators.macd.signal[currentIndex],
    macdHistogram: indicators.macd.histogram[currentIndex],
    sma5: indicators.sma.sma5[currentIndex],
    sma20: indicators.sma.sma20[currentIndex],
    sma50: indicators.sma.sma50[currentIndex],
    bollingerUpper: indicators.bollingerBands.upper[currentIndex],
    bollingerMiddle: indicators.bollingerBands.middle[currentIndex],
    bollingerLower: indicators.bollingerBands.lower[currentIndex],
    ema12: indicators.ema.ema12[currentIndex],
    ema26: indicators.ema.ema26[currentIndex]
  };

  const similarPatterns: SimilarPattern[] = [];

  // 過去のデータをスキャン（最新から50日前まではスキップして、それより前を分析）
  // これにより、将来のデータが十分に存在する期間を分析できる
  const lookbackStart = Math.max(0, currentIndex - 100); // 最大100日前まで
  const lookbackEnd = currentIndex - 10; // 最低10日前まで（将来のデータを確保）

  for (let i = lookbackStart; i < lookbackEnd; i++) {
    // 指標が有効な値かチェック
    if (
      isNaN(indicators.rsi[i]) ||
      isNaN(indicators.macd.macd[i]) ||
      isNaN(indicators.sma.sma20[i])
    ) {
      continue;
    }

    const historicalIndicators: IndicatorSnapshot = {
      date: priceData[i].date,
      price: priceData[i].close,
      rsi: indicators.rsi[i],
      macd: indicators.macd.macd[i],
      macdSignal: indicators.macd.signal[i],
      macdHistogram: indicators.macd.histogram[i],
      sma5: indicators.sma.sma5[i],
      sma20: indicators.sma.sma20[i],
      sma50: indicators.sma.sma50[i],
      bollingerUpper: indicators.bollingerBands.upper[i],
      bollingerMiddle: indicators.bollingerBands.middle[i],
      bollingerLower: indicators.bollingerBands.lower[i],
      ema12: indicators.ema.ema12[i],
      ema26: indicators.ema.ema26[i]
    };

    // 類似度を計算
    const similarity = calculateOverallSimilarity(currentIndicators, historicalIndicators);

    // 閾値以上の類似度の場合のみ追加
    if (similarity >= minSimilarity) {
      const futurePerformance = calculateFuturePerformance(priceData, i);

      // 将来のパフォーマンスデータがある場合のみ追加
      if (futurePerformance.length > 0) {
        similarPatterns.push({
          date: priceData[i].date,
          similarity,
          indicators: historicalIndicators,
          futurePerformance
        });
      }
    }
  }

  // 類似度でソート
  similarPatterns.sort((a, b) => b.similarity - a.similarity);

  // 予測を計算
  const prediction = calculatePrediction(similarPatterns);

  // サマリーを生成
  const summary = generateSummary(similarPatterns, prediction);

  return {
    currentIndicators,
    similarPatterns: similarPatterns.slice(0, 10), // 上位10件のみ返す
    prediction,
    summary
  };
}

/**
 * 類似パターンから予測を計算
 */
function calculatePrediction(patterns: SimilarPattern[]): PatternAnalysisResult['prediction'] {
  if (patterns.length === 0) {
    return {
      averageReturn1Day: 0,
      averageReturn3Day: 0,
      averageReturn5Day: 0,
      averageReturn7Day: 0,
      successRate: 0,
      confidence: 0,
      volatilityExpectation: 0
    };
  }

  // 各期間の平均リターンを計算
  const returns = {
    day1: [] as number[],
    day3: [] as number[],
    day5: [] as number[],
    day7: [] as number[]
  };
  const volatilities: number[] = [];

  for (const pattern of patterns) {
    for (const perf of pattern.futurePerformance) {
      if (perf.days === 1) returns.day1.push(perf.priceChangePercent);
      if (perf.days === 3) returns.day3.push(perf.priceChangePercent);
      if (perf.days === 5) returns.day5.push(perf.priceChangePercent);
      if (perf.days === 7) returns.day7.push(perf.priceChangePercent);
      volatilities.push(perf.volatility);
    }
  }

  const average = (arr: number[]) => arr.length > 0 ? arr.reduce((a, b) => a + b, 0) / arr.length : 0;

  // 成功率（上昇した確率）を計算（7日後のデータを使用）
  const positiveReturns = returns.day7.filter(r => r > 0).length;
  const successRate = returns.day7.length > 0 ? (positiveReturns / returns.day7.length) * 100 : 0;

  // 信頼度（類似パターン数に基づく）
  // 5件以上で高信頼、10件以上で非常に高信頼
  const confidence = Math.min(100, (patterns.length / 10) * 100);

  return {
    averageReturn1Day: average(returns.day1),
    averageReturn3Day: average(returns.day3),
    averageReturn5Day: average(returns.day5),
    averageReturn7Day: average(returns.day7),
    successRate,
    confidence,
    volatilityExpectation: average(volatilities)
  };
}

/**
 * 分析結果のサマリーを生成
 */
function generateSummary(
  patterns: SimilarPattern[],
  prediction: PatternAnalysisResult['prediction']
): string {
  if (patterns.length === 0) {
    return '現在の指標と類似する過去のパターンが見つかりませんでした。データ期間を延長するか、類似度の閾値を下げることをお勧めします。';
  }

  const { averageReturn7Day, successRate, confidence } = prediction;

  let summary = `${patterns.length}件の類似パターンを検出しました（信頼度: ${confidence.toFixed(0)}%）。\n\n`;

  if (successRate >= 70) {
    summary += `📈 過去の類似パターンでは、7日後に${successRate.toFixed(0)}%の確率で株価が上昇しています（平均${averageReturn7Day > 0 ? '+' : ''}${averageReturn7Day.toFixed(2)}%）。`;
    if (confidence >= 70) {
      summary += ' 高い信頼度で上昇トレンドが期待できます。';
    }
  } else if (successRate >= 50) {
    summary += `📊 過去の類似パターンでは、7日後に${successRate.toFixed(0)}%の確率で株価が上昇していますが、平均リターンは${averageReturn7Day > 0 ? '+' : ''}${averageReturn7Day.toFixed(2)}%です。`;
    summary += ' 様子見が推奨されます。';
  } else {
    summary += `📉 過去の類似パターンでは、7日後に${(100 - successRate).toFixed(0)}%の確率で株価が下落しています（平均${averageReturn7Day > 0 ? '+' : ''}${averageReturn7Day.toFixed(2)}%）。`;
    if (confidence >= 70) {
      summary += ' 高い信頼度で下落リスクがあります。慎重な判断が必要です。';
    }
  }

  if (prediction.volatilityExpectation > 5) {
    summary += `\n\n⚠️ 期待ボラティリティは${prediction.volatilityExpectation.toFixed(1)}%と高めです。価格変動に注意してください。`;
  }

  return summary;
}
