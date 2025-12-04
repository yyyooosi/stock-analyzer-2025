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
    rsi: 0.15,                 // RSI
    rsiZone: 0.05,            // RSIの範囲（買われすぎ/売られすぎ）
    macd: 0.12,               // MACD
    macdHistogram: 0.12,      // MACDヒストグラム
    macdCross: 0.06,          // MACDクロス状態
    smaRatios: 0.15,          // 移動平均線の比率
    smaTrend: 0.10,           // 移動平均のトレンド（配置）
    emaRatio: 0.15,           // EMA比率
    bollingerPosition: 0.10   // ボリンジャーバンド内の位置
  };

  let totalSimilarity = 0;
  let totalWeight = 0;

  // 1. RSI類似度
  if (current.rsi !== undefined && historical.rsi !== undefined) {
    totalSimilarity += calculateSimilarity(current.rsi, historical.rsi, 0.15) * weights.rsi;
    totalWeight += weights.rsi;

    // RSIの範囲（ゾーン）の一致度
    const currentZone = getRSIZone(current.rsi);
    const historicalZone = getRSIZone(historical.rsi);
    if (currentZone === historicalZone) {
      totalSimilarity += 100 * weights.rsiZone; // 完全一致
      totalWeight += weights.rsiZone;
    } else {
      totalWeight += weights.rsiZone;
      // 不一致の場合は0点
    }
  }

  // 2. MACD類似度
  if (current.macd !== undefined && historical.macd !== undefined) {
    totalSimilarity += calculateSimilarity(current.macd, historical.macd, 0.25) * weights.macd;
    totalWeight += weights.macd;
  }

  // 3. MACDヒストグラム類似度
  if (current.macdHistogram !== undefined && historical.macdHistogram !== undefined) {
    totalSimilarity += calculateSimilarity(current.macdHistogram, historical.macdHistogram, 0.25) * weights.macdHistogram;
    totalWeight += weights.macdHistogram;

    // MACDクロス状態の一致度（ゴールデンクロス/デッドクロス）
    if (current.macd !== undefined && current.macdSignal !== undefined &&
        historical.macd !== undefined && historical.macdSignal !== undefined) {
      const currentCross = current.macd > current.macdSignal ? 'golden' : 'dead';
      const historicalCross = historical.macd > historical.macdSignal ? 'golden' : 'dead';
      if (currentCross === historicalCross) {
        totalSimilarity += 100 * weights.macdCross;
        totalWeight += weights.macdCross;
      } else {
        totalWeight += weights.macdCross;
      }
    }
  }

  // 4. 移動平均線の比率（複数の比率を総合評価）
  const smaRatioScores: number[] = [];

  if (current.sma5 && current.sma20 && historical.sma5 && historical.sma20) {
    const currentRatio = current.sma5 / current.sma20;
    const historicalRatio = historical.sma5 / historical.sma20;
    smaRatioScores.push(calculateSimilarity(currentRatio, historicalRatio, 0.08));
  }

  if (current.sma20 && current.sma50 && historical.sma20 && historical.sma50) {
    const currentRatio = current.sma20 / current.sma50;
    const historicalRatio = historical.sma20 / historical.sma50;
    smaRatioScores.push(calculateSimilarity(currentRatio, historicalRatio, 0.08));
  }

  if (current.sma5 && current.sma50 && historical.sma5 && historical.sma50) {
    const currentRatio = current.sma5 / current.sma50;
    const historicalRatio = historical.sma5 / historical.sma50;
    smaRatioScores.push(calculateSimilarity(currentRatio, historicalRatio, 0.08));
  }

  if (smaRatioScores.length > 0) {
    const avgSmaRatio = smaRatioScores.reduce((a, b) => a + b, 0) / smaRatioScores.length;
    totalSimilarity += avgSmaRatio * weights.smaRatios;
    totalWeight += weights.smaRatios;
  }

  // 5. 移動平均のトレンド（配置）の一致度
  if (current.sma5 && current.sma20 && current.sma50 && historical.sma5 && historical.sma20 && historical.sma50) {
    const currentTrend = getMovingAverageTrend(current.sma5, current.sma20, current.sma50);
    const historicalTrend = getMovingAverageTrend(historical.sma5, historical.sma20, historical.sma50);
    if (currentTrend === historicalTrend) {
      totalSimilarity += 100 * weights.smaTrend;
      totalWeight += weights.smaTrend;
    } else {
      totalWeight += weights.smaTrend;
    }
  }

  // 6. EMA比率
  if (current.ema12 && current.ema26 && historical.ema12 && historical.ema26) {
    const currentRatio = current.ema12 / current.ema26;
    const historicalRatio = historical.ema12 / historical.ema26;
    totalSimilarity += calculateSimilarity(currentRatio, historicalRatio, 0.08) * weights.emaRatio;
    totalWeight += weights.emaRatio;
  }

  // 7. ボリンジャーバンド内の位置
  if (current.price && current.bollingerUpper && current.bollingerLower && current.bollingerMiddle &&
      historical.price && historical.bollingerUpper && historical.bollingerLower && historical.bollingerMiddle) {
    const currentPosition = getBollingerPosition(current.price, current.bollingerUpper, current.bollingerMiddle, current.bollingerLower);
    const historicalPosition = getBollingerPosition(historical.price, historical.bollingerUpper, historical.bollingerMiddle, historical.bollingerLower);
    totalSimilarity += calculateSimilarity(currentPosition, historicalPosition, 0.15) * weights.bollingerPosition;
    totalWeight += weights.bollingerPosition;
  }

  return totalWeight > 0 ? totalSimilarity / totalWeight : 0;
}

/**
 * RSIの範囲（ゾーン）を判定
 */
function getRSIZone(rsi: number): string {
  if (rsi >= 70) return 'overbought';    // 買われすぎ
  if (rsi >= 50) return 'bullish';       // 強気
  if (rsi >= 30) return 'bearish';       // 弱気
  return 'oversold';                     // 売られすぎ
}

/**
 * 移動平均のトレンド（配置）を判定
 */
function getMovingAverageTrend(sma5: number, sma20: number, sma50: number): string {
  if (sma5 > sma20 && sma20 > sma50) return 'strong_uptrend';    // 強い上昇トレンド
  if (sma5 > sma20 || sma20 > sma50) return 'uptrend';          // 上昇トレンド
  if (sma5 < sma20 && sma20 < sma50) return 'strong_downtrend'; // 強い下降トレンド
  if (sma5 < sma20 || sma20 < sma50) return 'downtrend';        // 下降トレンド
  return 'neutral';                                              // 中立
}

/**
 * ボリンジャーバンド内の相対位置を計算（0-100）
 */
function getBollingerPosition(price: number, upper: number, middle: number, lower: number): number {
  if (upper === lower) return 50; // バンド幅が0の場合は中央
  const position = ((price - lower) / (upper - lower)) * 100;
  return Math.max(0, Math.min(100, position)); // 0-100の範囲に制限
}

/**
 * 時間的な近さによるボーナスを計算
 * 最近のパターンほど現在の市場環境に近いため、信頼性が高い
 */
function calculateRecencyBonus(daysFromNow: number): number {
  // 7日以内：10%ボーナス
  if (daysFromNow <= 7) return 0.10;
  // 14日以内：7%ボーナス
  if (daysFromNow <= 14) return 0.07;
  // 30日以内：5%ボーナス
  if (daysFromNow <= 30) return 0.05;
  // 60日以内：3%ボーナス
  if (daysFromNow <= 60) return 0.03;
  // それ以上：ボーナスなし
  return 0;
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
  minSimilarity: number = 55 // 最低類似度（0-100）- より高品質なパターンを検出
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

  // 過去のデータをスキャン
  // 7日後の予測をするため、最低7日分の将来データが必要
  const lookbackStart = 0; // データの最初から検索
  const lookbackEnd = Math.max(0, currentIndex - 7); // 7日分の将来データを確保

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
    let similarity = calculateOverallSimilarity(currentIndicators, historicalIndicators);

    // 時間的な近さによるボーナス（最近のパターンほど信頼性が高い）
    const daysFromNow = currentIndex - i;
    const recencyBonus = calculateRecencyBonus(daysFromNow);
    const adjustedSimilarity = similarity * (1 + recencyBonus);

    // 閾値以上の類似度の場合のみ追加
    if (similarity >= minSimilarity) {
      const futurePerformance = calculateFuturePerformance(priceData, i);

      // 将来のパフォーマンスデータがある場合のみ追加
      if (futurePerformance.length > 0) {
        similarPatterns.push({
          date: priceData[i].date,
          similarity: adjustedSimilarity, // 調整後の類似度を使用
          indicators: historicalIndicators,
          futurePerformance
        });
      }
    }
  }

  // 調整後の類似度でソート
  similarPatterns.sort((a, b) => b.similarity - a.similarity);

  // パターンが見つからない場合、段階的に閾値を下げて再検索
  if (similarPatterns.length === 0 && minSimilarity > 30) {
    console.log(`類似度${minSimilarity}%でパターンが見つかりませんでした。閾値を下げて再検索します...`);

    // 閾値を10%ずつ下げて再検索（最低30%まで）
    const lowerThreshold = Math.max(30, minSimilarity - 10);
    return findSimilarPatterns(priceData, indicators, lowerThreshold);
  }

  // 予測を計算
  const prediction = calculatePrediction(similarPatterns);

  // サマリーを生成
  const summary = generateSummary(similarPatterns, prediction, minSimilarity);

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
  prediction: PatternAnalysisResult['prediction'],
  usedSimilarity?: number
): string {
  if (patterns.length === 0) {
    return '現在の指標と類似する過去のパターンが見つかりませんでした。データ期間が不足しているか、現在の市場状況が独特である可能性があります。';
  }

  const { averageReturn7Day, successRate, confidence } = prediction;

  let summary = `${patterns.length}件の類似パターンを検出しました`;

  // 類似度閾値が50%未満の場合は明示
  if (usedSimilarity && usedSimilarity < 50) {
    summary += `（類似度${usedSimilarity}%以上、信頼度: ${confidence.toFixed(0)}%）。\n\n`;
    summary += `⚠️ 類似度の閾値を${usedSimilarity}%まで下げて検索しました。参考程度にご利用ください。\n\n`;
  } else {
    summary += `（信頼度: ${confidence.toFixed(0)}%）。\n\n`;
  }

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
