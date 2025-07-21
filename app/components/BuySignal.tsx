export interface SignalAnalysis {
  overallScore: number;
  signal: 'STRONG_BUY' | 'BUY' | 'HOLD' | 'SELL' | 'STRONG_SELL';
  signals: {
    rsi: { score: number; reason: string };
    macd: { score: number; reason: string };
    movingAverage: { score: number; reason: string };
    bollingerBands: { score: number; reason: string };
  };
  individualScores: {
    rsi: number;
    macd: number;
    movingAverage: number;
    bollingerBands: number;
  };
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH';
  reasons: string[];
  recommendation: string;
  confidence: number;
}

export function analyzeSignals(
  currentPrice: number,
  indicators: {
    rsi: number | null;
    macd: number | null;
    macdSignal: number | null;
    macdHistogram: number | null;
    sma5: number | null;
    sma20: number | null;
    sma50: number | null;
    bollingerUpper: number | null;
    bollingerLower: number | null;
    bollingerMiddle: number | null;
  }
): SignalAnalysis {
  
  // RSI分析
  const rsiAnalysis = calculateRSIScore(indicators.rsi);
  
  // MACD分析
  const macdAnalysis = calculateMACDScore(
    indicators.macd,
    indicators.macdSignal,
    indicators.macdHistogram
  );
  
  // 移動平均分析
  const maAnalysis = calculateMovingAverageScore(
    currentPrice,
    indicators.sma5,
    indicators.sma20,
    indicators.sma50
  );
  
  // ボリンジャーバンド分析
  const bollingerAnalysis = calculateBollingerScore(
    currentPrice,
    indicators.bollingerUpper,
    indicators.bollingerLower,
    indicators.bollingerMiddle
  );
  
  // 総合スコア計算（重み付き平均）
  const weights = { rsi: 0.25, macd: 0.3, ma: 0.3, bollinger: 0.15 };
  const totalScore = 
    (rsiAnalysis.score * weights.rsi) +
    (macdAnalysis.score * weights.macd) +
    (maAnalysis.score * weights.ma) +
    (bollingerAnalysis.score * weights.bollinger);
  
  // 0-100スケールに正規化
  const normalizedScore = Math.max(0, Math.min(100, 50 + totalScore));
  
  // コンフィデンスの計算（シグナルより先に計算）
  const confidence = calculateConfidence(normalizedScore, [
    rsiAnalysis.score,
    macdAnalysis.score,
    maAnalysis.score,
    bollingerAnalysis.score
  ]);
  
  // シグナルの決定
  const signal = getSignal(normalizedScore);
  
  // リスクレベルの決定
  const riskLevel = getRiskLevel(normalizedScore, confidence);
  
  // 推奨
  const recommendation = getRecommendation(normalizedScore);

  // 理由をまとめる
  const reasons = [
    rsiAnalysis.reason,
    macdAnalysis.reason,
    maAnalysis.reason,
    bollingerAnalysis.reason
  ];
  
  return {
    overallScore: Math.round(normalizedScore),
    signal,
    signals: {
      rsi: rsiAnalysis,
      macd: macdAnalysis,
      movingAverage: maAnalysis,
      bollingerBands: bollingerAnalysis
    },
    individualScores: {
      rsi: rsiAnalysis.score,
      macd: macdAnalysis.score,
      movingAverage: maAnalysis.score,
      bollingerBands: bollingerAnalysis.score
    },
    riskLevel,
    reasons,
    recommendation,
    confidence
  };
}

function calculateRSIScore(rsi: number | null): { score: number; reason: string } {
  if (rsi === null) {
    return { score: 0, reason: 'RSIデータなし' };
  }
  
  let score = 0;
  let reason = '';
  
  if (rsi < 30) {
    score = 20;
    reason = `RSI ${rsi.toFixed(1)} - 売られすぎ(買いシグナル)`;
  } else if (rsi < 40) {
    score = 10;
    reason = `RSI ${rsi.toFixed(1)} - やや売られすぎ`;
  } else if (rsi > 70) {
    score = -20;
    reason = `RSI ${rsi.toFixed(1)} - 買われすぎ(売りシグナル)`;
  } else if (rsi > 60) {
    score = -10;
    reason = `RSI ${rsi.toFixed(1)} - やや買われすぎ`;
  } else {
    score = 0;
    reason = `RSI ${rsi.toFixed(1)} - 中立圏`;
  }
  
  return { score, reason };
}

function calculateMACDScore(macd: number | null, signal: number | null, histogram: number | null): { score: number; reason: string } {
  if (macd === null || signal === null || histogram === null) {
    return { score: 0, reason: 'MACDデータなし' };
  }
  
  let score = 0;
  const reasons: string[] = [];
  
  // MACD線とシグナル線の関係
  if (macd > signal) {
    score += 10;
    reasons.push('MACD > Signal(買いシグナル)');
  } else {
    score -= 10;
    reasons.push('MACD < Signal(売りシグナル)');
  }
  
  // ヒストグラムの傾向
  if (histogram > 0) {
    score += histogram > 0.5 ? 15 : 8;
    reasons.push('MACDヒストグラム正(上昇モメンタム)');
  } else {
    score -= histogram < -0.5 ? 15 : 8;
    reasons.push('MACDヒストグラム負(下降モメンタム)');
  }
  
  // スコアを-25から25の範囲に調整
  score = Math.max(-25, Math.min(25, score));
  
  return { score, reason: reasons.join(', ') };
}

function calculateMovingAverageScore(
  currentPrice: number,
  sma5: number | null,
  sma20: number | null,
  sma50: number | null
): { score: number; reason: string } {
  if (sma5 === null || sma20 === null) {
    return { score: 0, reason: '移動平均データ不足' };
  }
  
  let score = 0;
  const reasons: string[] = [];
  
  // 短期移動平均の関係
  if (sma5 > sma20) {
    score += 10;
    reasons.push('SMA5 > SMA20(上昇トレンド)');
  } else {
    score -= 10;
    reasons.push('SMA5 < SMA20(下降トレンド)');
  }
  
  // 現在価格と移動平均の関係
  if (currentPrice > sma5) {
    score += 8;
    reasons.push('価格 > SMA5(短期強気)');
  } else {
    score -= 8;
    reasons.push('価格 < SMA5(短期弱気)');
  }
  
  // 長期移動平均との関係
  if (sma50 !== null) {
    if (sma20 > sma50) {
      score += 7;
      reasons.push('SMA20 > SMA50(中期上昇)');
    } else {
      score -= 7;
      reasons.push('SMA20 < SMA50(中期下降)');
    }
  }
  
  return { score: Math.max(-25, Math.min(25, score)), reason: reasons.join(', ') };
}

function calculateBollingerScore(
  currentPrice: number,
  upper: number | null,
  lower: number | null,
  middle: number | null
): { score: number; reason: string } {
  if (upper === null || lower === null || middle === null) {
    return { score: 0, reason: 'ボリンジャーバンドデータなし' };
  }
  
  let score = 0;
  let reason = '';
  
  const bandWidth = upper - lower;
  const position = (currentPrice - lower) / bandWidth;
  
  if (position < 0.2) {
    score = 15;
    reason = '下部バンド付近(買いシグナル)';
  } else if (position < 0.4) {
    score = 8;
    reason = '下半分レンジ(やや買い)';
  } else if (position > 0.8) {
    score = -15;
    reason = '上部バンド付近(売りシグナル)';
  } else if (position > 0.6) {
    score = -8;
    reason = '上半分レンジ(やや売り)';
  } else {
    score = 0;
    reason = '中央レンジ(中立)';
  }
  
  return { score, reason };
}

function getRecommendation(score: number): string {
  if (score >= 70) return '強い買い推奨';
  if (score >= 60) return '買い推奨';
  if (score >= 50) return 'やや買い';
  if (score >= 40) return '様子見';
  if (score >= 30) return 'やや売り';
  return '売り推奨';
}

function getSignal(score: number): 'STRONG_BUY' | 'BUY' | 'HOLD' | 'SELL' | 'STRONG_SELL' {
  if (score >= 80) return 'STRONG_BUY';
  if (score >= 60) return 'BUY';
  if (score >= 40) return 'HOLD';
  if (score >= 20) return 'SELL';
  return 'STRONG_SELL';
}

function getRiskLevel(score: number, confidence: number): 'LOW' | 'MEDIUM' | 'HIGH' {
  if (confidence >= 80 && (score >= 70 || score <= 30)) return 'LOW';
  if (confidence >= 60) return 'MEDIUM';
  return 'HIGH';
}

function calculateConfidence(overallScore: number, individualScores: number[]): number {
  // スコアの分散を計算してコンフィデンスを決定
  const mean = individualScores.reduce((sum, score) => sum + score, 0) / individualScores.length;
  const variance = individualScores.reduce((sum, score) => sum + Math.pow(score - mean, 2), 0) / individualScores.length;
  const standardDeviation = Math.sqrt(variance);
  
  // 標準偏差が小さいほど、つまり各指標が一致しているほどコンフィデンスが高い
  const baseConfidence = Math.max(50, 100 - standardDeviation * 2);
  
  // 極端なスコア（0に近いまたは100に近い）ほどコンフィデンスを上げる
  const extremeBonus = Math.abs(overallScore - 50) * 0.5;
  
  return Math.min(95, Math.round(baseConfidence + extremeBonus));
}