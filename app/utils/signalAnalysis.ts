interface LatestIndicators {
  rsi: number | null;
  macd: {
    macd: number | null;
    signal: number | null;
    histogram: number | null;
  };
  sma: {
    sma5: number | null;
    sma20: number | null;
    sma50: number | null;
  };
  ema: {
    ema12: number | null;
    ema26: number | null;
  };
  bollingerBands: {
    upper: number | null;
    middle: number | null;
    lower: number | null;
  };
}

export interface SignalAnalysis {
  overallScore: number; // -100 to +100
  signal: 'STRONG_BUY' | 'BUY' | 'HOLD' | 'SELL' | 'STRONG_SELL';
  confidence: number; // 0 to 100
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH';
  reasons: string[];
  individualScores: {
    rsi: number;
    macd: number;
    movingAverage: number;
    bollingerBands: number;
  };
  recommendation: string;
}

// RSIスコア計算 (-25 to +25)
function calculateRSIScore(rsi: number | null): { score: number; reason: string } {
  if (rsi === null) return { score: 0, reason: 'RSIデータなし' };
  
  if (rsi <= 20) return { score: 25, reason: 'RSI極度の売られすぎ(強い買いシグナル)' };
  if (rsi <= 30) return { score: 15, reason: 'RSI売られすぎ(買いシグナル)' };
  if (rsi <= 40) return { score: 5, reason: 'RSI弱い買いシグナル' };
  if (rsi >= 80) return { score: -25, reason: 'RSI極度の買われすぎ(強い売りシグナル)' };
  if (rsi >= 70) return { score: -15, reason: 'RSI買われすぎ(売りシグナル)' };
  if (rsi >= 60) return { score: -5, reason: 'RSI弱い売りシグナル' };
  
  return { score: 0, reason: 'RSIニュートラル' };
}

// MACDスコア計算 (-25 to +25)
function calculateMACDScore(macd: number | null, signal: number | null, histogram: number | null): { score: number; reason: string } {
  if (macd === null || signal === null || histogram === null) {
    return { score: 0, reason: 'MACDデータなし' };
  }
  
  let score = 0;
  let reasons: string[] = [];
  
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

// 移動平均スコア計算 (-25 to +25)
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
  let reasons: string[] = [];
  
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

// ボリンジャーバンドスコア計算 (-25 to +25)
function calculateBollingerScore(
  currentPrice: number,
  upper: number | null,
  middle: number | null,
  lower: number | null
): { score: number; reason: string } {
  if (upper === null || middle === null || lower === null) {
    return { score: 0, reason: 'ボリンジャーバンドデータなし' };
  }
  
  const bandWidth = upper - lower;
  const pricePosition = (currentPrice - lower) / bandWidth;
  
  let score = 0;
  let reason = '';
  
  if (pricePosition <= 0.1) {
    score = 20;
    reason = 'ボリンジャーバンド下限近く(強い買いシグナル)';
  } else if (pricePosition <= 0.2) {
    score = 15;
    reason = 'ボリンジャーバンド下側(買いシグナル)';
  } else if (pricePosition >= 0.9) {
    score = -20;
    reason = 'ボリンジャーバンド上限近く(強い売りシグナル)';
  } else if (pricePosition >= 0.8) {
    score = -15;
    reason = 'ボリンジャーバンド上側(売りシグナル)';
  } else if (pricePosition >= 0.4 && pricePosition <= 0.6) {
    score = 0;
    reason = 'ボリンジャーバンド中央付近(ニュートラル)';
  } else if (pricePosition < 0.4) {
    score = 5;
    reason = 'ボリンジャーバンド下半分(弱い買いシグナル)';
  } else {
    score = -5;
    reason = 'ボリンジャーバンド上半分(弱い売りシグナル)';
  }
  
  return { score, reason };
}

// 総合シグナル分析
export function analyzeSignals(indicators: LatestIndicators, currentPrice: number): SignalAnalysis {
  // 各指標のスコアを計算
  const rsiResult = calculateRSIScore(indicators.rsi);
  const macdResult = calculateMACDScore(
    indicators.macd.macd,
    indicators.macd.signal,
    indicators.macd.histogram
  );
  const maResult = calculateMovingAverageScore(
    currentPrice,
    indicators.sma.sma5,
    indicators.sma.sma20,
    indicators.sma.sma50
  );
  const bbResult = calculateBollingerScore(
    currentPrice,
    indicators.bollingerBands.upper,
    indicators.bollingerBands.middle,
    indicators.bollingerBands.lower
  );
  
  // 総合スコア計算（各指標に重み付け）
  const weights = {
    rsi: 1.0,
    macd: 1.2, // MACDを少し重視
    movingAverage: 1.1, // 移動平均を少し重視
    bollingerBands: 0.9
  };
  
  const weightedScore = 
    (rsiResult.score * weights.rsi) +
    (macdResult.score * weights.macd) +
    (maResult.score * weights.movingAverage) +
    (bbResult.score * weights.bollingerBands);
  
  const totalWeight = weights.rsi + weights.macd + weights.movingAverage + weights.bollingerBands;
  const overallScore = Math.round(weightedScore / totalWeight * 100) / 100;
  
  // シグナル判定
  let signal: SignalAnalysis['signal'];
  let confidence: number;
  let riskLevel: SignalAnalysis['riskLevel'];
  
  if (overallScore >= 15) {
    signal = 'STRONG_BUY';
    confidence = Math.min(95, 70 + Math.abs(overallScore - 15) * 2);
    riskLevel = 'MEDIUM';
  } else if (overallScore >= 5) {
    signal = 'BUY';
    confidence = Math.min(85, 60 + Math.abs(overallScore - 5) * 2);
    riskLevel = 'MEDIUM';
  } else if (overallScore >= -5) {
    signal = 'HOLD';
    confidence = 50 + Math.abs(overallScore) * 2;
    riskLevel = 'LOW';
  } else if (overallScore >= -15) {
    signal = 'SELL';
    confidence = Math.min(85, 60 + Math.abs(overallScore + 5) * 2);
    riskLevel = 'MEDIUM';
  } else {
    signal = 'STRONG_SELL';
    confidence = Math.min(95, 70 + Math.abs(overallScore + 15) * 2);
    riskLevel = 'HIGH';
  }
  
  // 推奨理由の収集
  const reasons = [
    rsiResult.reason,
    macdResult.reason,
    maResult.reason,
    bbResult.reason
  ].filter(reason => reason && !reason.includes('データなし'));
  
  // 推奨アクションの生成
  let recommendation: string;
  switch (signal) {
    case 'STRONG_BUY':
      recommendation = '積極的な買いポジションを検討。ただし、リスク管理を怠らずに。';
      break;
    case 'BUY':
      recommendation = '買いポジションを検討。段階的な投資を推奨。';
      break;
    case 'HOLD':
      recommendation = '現在のポジションを維持。市場動向を継続監視。';
      break;
    case 'SELL':
      recommendation = '売りを検討。利益確定または損切りのタイミング。';
      break;
    case 'STRONG_SELL':
      recommendation = '速やかな売却を検討。リスクが高い状況。';
      break;
  }
  
  return {
    overallScore,
    signal,
    confidence: Math.round(confidence),
    riskLevel,
    reasons,
    individualScores: {
      rsi: rsiResult.score,
      macd: macdResult.score,
      movingAverage: maResult.score,
      bollingerBands: bbResult.score
    },
    recommendation
  };
}