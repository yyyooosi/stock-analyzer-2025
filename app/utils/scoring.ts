// 株式スコアリングロジック

export interface StockMetrics {
  symbol: string;
  name: string;
  sector: string;
  price: number;
  change: number;
  changePercent: number;
  marketCap: number; // 時価総額（百万ドル）

  // ファンダメンタル指標
  per: number;         // PER
  pbr: number;         // PBR
  peg: number;         // PEG
  roe: number;         // ROE (%)
  epsGrowth3Y: number; // EPS成長率 3年 (%)
  epsGrowth5Y: number; // EPS成長率 5年 (%)
  revenueGrowth: number; // 売上高成長率 (%)
  operatingMargin: number; // 営業利益率 (%)

  // 財務健全性
  equityRatio: number;   // 自己資本比率 (%)
  currentRatio: number;  // 流動比率
  debtRatio: number;     // 有利子負債比率 (%)
  operatingCashFlow: number; // 営業CF（百万ドル）

  // 配当条件
  dividendYield: number;    // 配当利回り (%)
  consecutiveDividendYears: number; // 連続増配年数
  payoutRatio: number;      // 配当性向 (%)

  // テクニカル指標
  priceVs50MA: number;  // 株価と50日MAの比率 (%)
  priceVs200MA: number; // 株価と200日MAの比率 (%)
  rsi: number;          // RSI
  macdSignal: 'bullish' | 'bearish' | 'neutral'; // MACDシグナル
  volumeChange: number; // 出来高増加率 (%)

  // タグ
  tags: string[];
}

export interface ScoreBreakdown {
  growth: number;       // 成長性 (0-30)
  value: number;        // 割安性 (0-25)
  financial: number;    // 財務健全性 (0-20)
  dividend: number;     // 配当 (0-10)
  technical: number;    // テクニカル (0-15)
  total: number;        // 総合スコア (0-100)
}

export interface ScoredStock extends StockMetrics {
  score: ScoreBreakdown;
}

// 成長性スコア (0-30)
function calculateGrowthScore(metrics: StockMetrics): number {
  let score = 0;

  // EPS成長率 3Y
  if (metrics.epsGrowth3Y > 20) score += 8;
  else if (metrics.epsGrowth3Y > 15) score += 6;
  else if (metrics.epsGrowth3Y > 10) score += 4;
  else if (metrics.epsGrowth3Y > 5) score += 2;

  // EPS成長率 5Y
  if (metrics.epsGrowth5Y > 20) score += 7;
  else if (metrics.epsGrowth5Y > 15) score += 5;
  else if (metrics.epsGrowth5Y > 10) score += 3;
  else if (metrics.epsGrowth5Y > 5) score += 1;

  // 売上高成長率
  if (metrics.revenueGrowth > 25) score += 8;
  else if (metrics.revenueGrowth > 15) score += 6;
  else if (metrics.revenueGrowth > 10) score += 4;
  else if (metrics.revenueGrowth > 5) score += 2;

  // 営業利益率
  if (metrics.operatingMargin > 25) score += 7;
  else if (metrics.operatingMargin > 20) score += 5;
  else if (metrics.operatingMargin > 15) score += 3;
  else if (metrics.operatingMargin > 10) score += 1;

  return Math.min(30, score);
}

// 割安性スコア (0-25)
function calculateValueScore(metrics: StockMetrics): number {
  let score = 0;

  // PER (低いほど良い、ただし0以下は除外)
  if (metrics.per > 0 && metrics.per < 10) score += 10;
  else if (metrics.per >= 10 && metrics.per < 15) score += 8;
  else if (metrics.per >= 15 && metrics.per < 20) score += 6;
  else if (metrics.per >= 20 && metrics.per < 25) score += 4;
  else if (metrics.per >= 25 && metrics.per < 30) score += 2;

  // PEG (1未満が割安)
  if (metrics.peg > 0 && metrics.peg < 0.5) score += 8;
  else if (metrics.peg >= 0.5 && metrics.peg < 1) score += 6;
  else if (metrics.peg >= 1 && metrics.peg < 1.5) score += 4;
  else if (metrics.peg >= 1.5 && metrics.peg < 2) score += 2;

  // PBR
  if (metrics.pbr > 0 && metrics.pbr < 1) score += 7;
  else if (metrics.pbr >= 1 && metrics.pbr < 2) score += 5;
  else if (metrics.pbr >= 2 && metrics.pbr < 3) score += 3;
  else if (metrics.pbr >= 3 && metrics.pbr < 5) score += 1;

  return Math.min(25, score);
}

// 財務健全性スコア (0-20)
function calculateFinancialScore(metrics: StockMetrics): number {
  let score = 0;

  // 自己資本比率
  if (metrics.equityRatio > 60) score += 5;
  else if (metrics.equityRatio > 50) score += 4;
  else if (metrics.equityRatio > 40) score += 3;
  else if (metrics.equityRatio > 30) score += 2;
  else if (metrics.equityRatio > 20) score += 1;

  // 流動比率
  if (metrics.currentRatio > 2) score += 5;
  else if (metrics.currentRatio > 1.5) score += 4;
  else if (metrics.currentRatio > 1.2) score += 3;
  else if (metrics.currentRatio > 1) score += 2;

  // 有利子負債比率 (低いほど良い)
  if (metrics.debtRatio < 20) score += 5;
  else if (metrics.debtRatio < 40) score += 4;
  else if (metrics.debtRatio < 60) score += 3;
  else if (metrics.debtRatio < 80) score += 2;
  else if (metrics.debtRatio < 100) score += 1;

  // 営業CF（プラスなら加点）
  if (metrics.operatingCashFlow > 0) score += 5;

  return Math.min(20, score);
}

// 配当スコア (0-10)
function calculateDividendScore(metrics: StockMetrics): number {
  let score = 0;

  // 配当利回り
  if (metrics.dividendYield > 4) score += 4;
  else if (metrics.dividendYield > 3) score += 3;
  else if (metrics.dividendYield > 2) score += 2;
  else if (metrics.dividendYield > 1) score += 1;

  // 連続増配年数
  if (metrics.consecutiveDividendYears > 25) score += 4;
  else if (metrics.consecutiveDividendYears > 15) score += 3;
  else if (metrics.consecutiveDividendYears > 10) score += 2;
  else if (metrics.consecutiveDividendYears > 5) score += 1;

  // 配当性向 (30-60%が健全)
  if (metrics.payoutRatio > 30 && metrics.payoutRatio < 60) score += 2;
  else if (metrics.payoutRatio > 20 && metrics.payoutRatio <= 70) score += 1;

  return Math.min(10, score);
}

// テクニカルスコア (0-15)
function calculateTechnicalScore(metrics: StockMetrics): number {
  let score = 0;

  // 株価 vs 50日MA
  if (metrics.priceVs50MA > 5) score += 3;
  else if (metrics.priceVs50MA > 0) score += 2;
  else if (metrics.priceVs50MA > -5) score += 1;

  // 株価 vs 200日MA
  if (metrics.priceVs200MA > 10) score += 3;
  else if (metrics.priceVs200MA > 0) score += 2;
  else if (metrics.priceVs200MA > -5) score += 1;

  // RSI (30-70の範囲、50付近が中立)
  if (metrics.rsi >= 30 && metrics.rsi <= 50) score += 4; // 割安圏
  else if (metrics.rsi > 50 && metrics.rsi <= 60) score += 3; // 上昇中
  else if (metrics.rsi > 60 && metrics.rsi <= 70) score += 2; // やや過熱
  else if (metrics.rsi > 20 && metrics.rsi < 30) score += 3; // 売られ過ぎ

  // MACDシグナル
  if (metrics.macdSignal === 'bullish') score += 3;
  else if (metrics.macdSignal === 'neutral') score += 1;

  // 出来高増加
  if (metrics.volumeChange > 20) score += 2;
  else if (metrics.volumeChange > 0) score += 1;

  return Math.min(15, score);
}

// 総合スコア計算
export function calculateScore(metrics: StockMetrics): ScoreBreakdown {
  const growth = calculateGrowthScore(metrics);
  const value = calculateValueScore(metrics);
  const financial = calculateFinancialScore(metrics);
  const dividend = calculateDividendScore(metrics);
  const technical = calculateTechnicalScore(metrics);

  return {
    growth,
    value,
    financial,
    dividend,
    technical,
    total: growth + value + financial + dividend + technical
  };
}

// 株式にスコアを付与
export function scoreStock(metrics: StockMetrics): ScoredStock {
  return {
    ...metrics,
    score: calculateScore(metrics)
  };
}

// 複数銘柄のスコアリング
export function scoreStocks(stocks: StockMetrics[]): ScoredStock[] {
  return stocks.map(scoreStock).sort((a, b) => b.score.total - a.score.total);
}

// スコアによる評価
export function getScoreRating(score: number): {
  rating: string;
  color: string;
  description: string;
} {
  if (score >= 80) {
    return { rating: '優秀', color: 'text-green-500', description: '非常に魅力的な投資先' };
  } else if (score >= 65) {
    return { rating: '良好', color: 'text-green-400', description: '投資検討に値する' };
  } else if (score >= 50) {
    return { rating: '普通', color: 'text-yellow-400', description: '条件次第で投資可能' };
  } else if (score >= 35) {
    return { rating: '注意', color: 'text-orange-400', description: 'リスクを考慮すべき' };
  } else {
    return { rating: '要警戒', color: 'text-red-400', description: '投資には注意が必要' };
  }
}

// カテゴリ別の強み判定
export function getStockStrengths(score: ScoreBreakdown): string[] {
  const strengths: string[] = [];

  if (score.growth >= 22) strengths.push('高成長');
  if (score.value >= 18) strengths.push('割安');
  if (score.financial >= 15) strengths.push('財務優良');
  if (score.dividend >= 7) strengths.push('高配当');
  if (score.technical >= 11) strengths.push('上昇トレンド');

  return strengths;
}
