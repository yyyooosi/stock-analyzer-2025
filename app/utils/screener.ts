// Screener types and scoring logic

export interface ScreenerFilters {
  // Fundamental conditions
  perMin?: number;
  perMax?: number;
  pbrMin?: number;
  pbrMax?: number;
  pegMin?: number;
  pegMax?: number;
  roeMin?: number;
  epsGrowth3YMin?: number;
  epsGrowth5YMin?: number;
  revenueGrowthMin?: number;
  revenueGrowthMax?: number;
  operatingMarginMin?: number;
  grossMarginMin?: number;

  // Advanced valuation
  forwardPERMin?: number;
  forwardPERMax?: number;
  evEbitdaMin?: number;
  evEbitdaMax?: number;

  // Financial health
  equityRatioMin?: number;
  currentRatioMin?: number;
  debtRatioMax?: number;
  debtToEquityMax?: number;
  operatingCFPositive?: boolean;
  freeCashFlowPositive?: boolean;
  freeCashFlow3YPositive?: boolean;

  // Growth & Innovation
  rdExpenseRatioMin?: number;
  rdExpenseRatioMax?: number;

  // Dividend conditions
  dividendYieldMin?: number;
  dividendYieldMax?: number;
  consecutiveDividendYearsMin?: number;
  payoutRatioMax?: number;
  payoutRatioMin?: number;

  // Technical conditions
  aboveSMA50?: boolean;
  aboveSMA200?: boolean;
  goldenCross?: boolean; // 50日MA > 200日MA
  rsiMin?: number;
  rsiMax?: number;
  macdBullish?: boolean;
  volumeIncreasePercent?: number;
  week52HighDistanceMax?: number; // 52週高値からの距離（%）

  // Twitter/X sentiment
  twitterMentionTrendPositive?: boolean;
  twitterSentimentFilter?: 'positive' | 'neutral' | 'negative' | 'any';
  excludeNegativeKeywords?: boolean;

  // Other
  marketCapMin?: number;
  marketCapMax?: number;
  marketCapUSDMin?: number;
  marketCapUSDMax?: number;
  sectors?: string[];
  themes?: string[];
}

export interface StockFundamentals {
  symbol: string;
  name: string;
  sector: string;
  industry: string;
  marketCap: number;
  marketCapUSD: number;
  price: number;
  change: number;
  changePercent: number;

  // Valuation
  per: number | null;
  pbr: number | null;
  peg: number | null;
  psRatio: number | null;
  forwardPER: number | null;
  evEbitda: number | null;

  // Growth
  roe: number | null;
  epsGrowth3Y: number | null;
  epsGrowth5Y: number | null;
  revenueGrowth: number | null;
  operatingMargin: number | null;
  grossMargin: number | null;
  rdExpenseRatio: number | null;

  // Financial health
  equityRatio: number | null;
  currentRatio: number | null;
  debtRatio: number | null;
  debtToEquity: number | null;
  operatingCF: number | null;
  freeCashFlow: number | null;
  freeCashFlow3YTrend: 'positive' | 'negative' | 'neutral' | null;

  // Dividend
  dividendYield: number | null;
  consecutiveDividendYears: number | null;
  payoutRatio: number | null;

  // Technical
  sma50: number | null;
  sma200: number | null;
  rsi: number | null;
  macdSignal: 'bullish' | 'bearish' | 'neutral';
  volumeChange: number | null;
  week52High: number | null;
  week52HighDistance: number | null; // 52週高値からの距離（%）

  // Twitter/X sentiment
  twitterMentionCount30d: number | null;
  twitterMentionTrend: 'increasing' | 'decreasing' | 'stable' | null;
  twitterSentiment: 'positive' | 'neutral' | 'negative' | null;
  hasNegativeKeywords: boolean;
}

export interface ScoreBreakdown {
  growth: number; // max 30
  value: number; // max 25
  financial: number; // max 20
  dividend: number; // max 10
  technical: number; // max 15
  total: number; // max 100
}

export interface ScreenerResult extends StockFundamentals {
  score: ScoreBreakdown;
}

// Scoring weights
const WEIGHTS = {
  growth: 30,
  value: 25,
  financial: 20,
  dividend: 10,
  technical: 15,
};

// Calculate growth score (max 30)
function calculateGrowthScore(stock: StockFundamentals): number {
  let score = 0;

  // EPS Growth 3Y
  if (stock.epsGrowth3Y !== null) {
    if (stock.epsGrowth3Y >= 20) score += 8;
    else if (stock.epsGrowth3Y >= 15) score += 6;
    else if (stock.epsGrowth3Y >= 10) score += 4;
    else if (stock.epsGrowth3Y >= 5) score += 2;
  }

  // EPS Growth 5Y
  if (stock.epsGrowth5Y !== null) {
    if (stock.epsGrowth5Y >= 15) score += 6;
    else if (stock.epsGrowth5Y >= 10) score += 4;
    else if (stock.epsGrowth5Y >= 5) score += 2;
  }

  // Revenue Growth
  if (stock.revenueGrowth !== null) {
    if (stock.revenueGrowth >= 20) score += 8;
    else if (stock.revenueGrowth >= 15) score += 6;
    else if (stock.revenueGrowth >= 10) score += 4;
    else if (stock.revenueGrowth >= 5) score += 2;
  }

  // ROE
  if (stock.roe !== null) {
    if (stock.roe >= 25) score += 8;
    else if (stock.roe >= 20) score += 6;
    else if (stock.roe >= 15) score += 4;
    else if (stock.roe >= 10) score += 2;
  }

  return Math.min(score, WEIGHTS.growth);
}

// Calculate value score (max 25)
function calculateValueScore(stock: StockFundamentals): number {
  let score = 0;

  // PER
  if (stock.per !== null && stock.per > 0) {
    if (stock.per <= 10) score += 8;
    else if (stock.per <= 15) score += 6;
    else if (stock.per <= 20) score += 4;
    else if (stock.per <= 25) score += 2;
  }

  // PBR
  if (stock.pbr !== null && stock.pbr > 0) {
    if (stock.pbr <= 1) score += 6;
    else if (stock.pbr <= 2) score += 4;
    else if (stock.pbr <= 3) score += 2;
  }

  // PEG
  if (stock.peg !== null && stock.peg > 0) {
    if (stock.peg <= 0.5) score += 8;
    else if (stock.peg <= 1) score += 6;
    else if (stock.peg <= 1.5) score += 4;
    else if (stock.peg <= 2) score += 2;
  }

  // Operating Margin
  if (stock.operatingMargin !== null) {
    if (stock.operatingMargin >= 25) score += 3;
    else if (stock.operatingMargin >= 15) score += 2;
    else if (stock.operatingMargin >= 10) score += 1;
  }

  return Math.min(score, WEIGHTS.value);
}

// Calculate financial health score (max 20)
function calculateFinancialScore(stock: StockFundamentals): number {
  let score = 0;

  // Equity Ratio
  if (stock.equityRatio !== null) {
    if (stock.equityRatio >= 50) score += 6;
    else if (stock.equityRatio >= 40) score += 4;
    else if (stock.equityRatio >= 30) score += 2;
  }

  // Current Ratio
  if (stock.currentRatio !== null) {
    if (stock.currentRatio >= 2) score += 5;
    else if (stock.currentRatio >= 1.5) score += 3;
    else if (stock.currentRatio >= 1) score += 1;
  }

  // Debt Ratio (lower is better)
  if (stock.debtRatio !== null) {
    if (stock.debtRatio <= 30) score += 5;
    else if (stock.debtRatio <= 50) score += 3;
    else if (stock.debtRatio <= 70) score += 1;
  }

  // Operating Cash Flow
  if (stock.operatingCF !== null && stock.operatingCF > 0) {
    score += 4;
  }

  return Math.min(score, WEIGHTS.financial);
}

// Calculate dividend score (max 10)
function calculateDividendScore(stock: StockFundamentals): number {
  let score = 0;

  // Dividend Yield
  if (stock.dividendYield !== null) {
    if (stock.dividendYield >= 4) score += 4;
    else if (stock.dividendYield >= 3) score += 3;
    else if (stock.dividendYield >= 2) score += 2;
    else if (stock.dividendYield >= 1) score += 1;
  }

  // Consecutive Dividend Years
  if (stock.consecutiveDividendYears !== null) {
    if (stock.consecutiveDividendYears >= 25) score += 4;
    else if (stock.consecutiveDividendYears >= 10) score += 3;
    else if (stock.consecutiveDividendYears >= 5) score += 2;
    else if (stock.consecutiveDividendYears >= 1) score += 1;
  }

  // Payout Ratio (moderate is best)
  if (stock.payoutRatio !== null) {
    if (stock.payoutRatio >= 30 && stock.payoutRatio <= 60) score += 2;
    else if (stock.payoutRatio >= 20 && stock.payoutRatio <= 80) score += 1;
  }

  return Math.min(score, WEIGHTS.dividend);
}

// Calculate technical score (max 15)
function calculateTechnicalScore(stock: StockFundamentals): number {
  let score = 0;

  // Above SMA200
  if (stock.sma200 !== null && stock.price > stock.sma200) {
    score += 4;
  }

  // Above SMA50
  if (stock.sma50 !== null && stock.price > stock.sma50) {
    score += 3;
  }

  // RSI (moderate range is best)
  if (stock.rsi !== null) {
    if (stock.rsi >= 40 && stock.rsi <= 60) score += 4;
    else if (stock.rsi >= 30 && stock.rsi <= 70) score += 2;
  }

  // MACD
  if (stock.macdSignal === 'bullish') {
    score += 4;
  } else if (stock.macdSignal === 'neutral') {
    score += 2;
  }

  return Math.min(score, WEIGHTS.technical);
}

// Calculate total score
export function calculateScore(stock: StockFundamentals): ScoreBreakdown {
  const growth = calculateGrowthScore(stock);
  const value = calculateValueScore(stock);
  const financial = calculateFinancialScore(stock);
  const dividend = calculateDividendScore(stock);
  const technical = calculateTechnicalScore(stock);

  return {
    growth,
    value,
    financial,
    dividend,
    technical,
    total: growth + value + financial + dividend + technical,
  };
}

// Apply filters to stock
export function matchesFilters(
  stock: StockFundamentals,
  filters: ScreenerFilters
): boolean {
  // PER
  if (filters.perMin !== undefined && (stock.per === null || stock.per < filters.perMin))
    return false;
  if (filters.perMax !== undefined && (stock.per === null || stock.per > filters.perMax))
    return false;

  // PBR
  if (filters.pbrMin !== undefined && (stock.pbr === null || stock.pbr < filters.pbrMin))
    return false;
  if (filters.pbrMax !== undefined && (stock.pbr === null || stock.pbr > filters.pbrMax))
    return false;

  // PEG
  if (filters.pegMin !== undefined && (stock.peg === null || stock.peg < filters.pegMin))
    return false;
  if (filters.pegMax !== undefined && (stock.peg === null || stock.peg > filters.pegMax))
    return false;

  // ROE
  if (filters.roeMin !== undefined && (stock.roe === null || stock.roe < filters.roeMin))
    return false;

  // EPS Growth
  if (
    filters.epsGrowth3YMin !== undefined &&
    (stock.epsGrowth3Y === null || stock.epsGrowth3Y < filters.epsGrowth3YMin)
  )
    return false;
  if (
    filters.epsGrowth5YMin !== undefined &&
    (stock.epsGrowth5Y === null || stock.epsGrowth5Y < filters.epsGrowth5YMin)
  )
    return false;

  // Revenue Growth
  if (
    filters.revenueGrowthMin !== undefined &&
    (stock.revenueGrowth === null || stock.revenueGrowth < filters.revenueGrowthMin)
  )
    return false;
  if (
    filters.revenueGrowthMax !== undefined &&
    (stock.revenueGrowth === null || stock.revenueGrowth > filters.revenueGrowthMax)
  )
    return false;

  // Operating Margin
  if (
    filters.operatingMarginMin !== undefined &&
    (stock.operatingMargin === null || stock.operatingMargin < filters.operatingMarginMin)
  )
    return false;

  // Gross Margin
  if (
    filters.grossMarginMin !== undefined &&
    (stock.grossMargin === null || stock.grossMargin < filters.grossMarginMin)
  )
    return false;

  // Forward PER
  if (
    filters.forwardPERMin !== undefined &&
    (stock.forwardPER === null || stock.forwardPER < filters.forwardPERMin)
  )
    return false;
  if (
    filters.forwardPERMax !== undefined &&
    (stock.forwardPER === null || stock.forwardPER > filters.forwardPERMax)
  )
    return false;

  // EV/EBITDA
  if (
    filters.evEbitdaMin !== undefined &&
    (stock.evEbitda === null || stock.evEbitda < filters.evEbitdaMin)
  )
    return false;
  if (
    filters.evEbitdaMax !== undefined &&
    (stock.evEbitda === null || stock.evEbitda > filters.evEbitdaMax)
  )
    return false;

  // R&D Expense Ratio
  if (
    filters.rdExpenseRatioMin !== undefined &&
    (stock.rdExpenseRatio === null || stock.rdExpenseRatio < filters.rdExpenseRatioMin)
  )
    return false;
  if (
    filters.rdExpenseRatioMax !== undefined &&
    (stock.rdExpenseRatio === null || stock.rdExpenseRatio > filters.rdExpenseRatioMax)
  )
    return false;

  // Financial Health
  if (
    filters.equityRatioMin !== undefined &&
    (stock.equityRatio === null || stock.equityRatio < filters.equityRatioMin)
  )
    return false;
  if (
    filters.currentRatioMin !== undefined &&
    (stock.currentRatio === null || stock.currentRatio < filters.currentRatioMin)
  )
    return false;
  if (
    filters.debtRatioMax !== undefined &&
    (stock.debtRatio === null || stock.debtRatio > filters.debtRatioMax)
  )
    return false;
  if (
    filters.debtToEquityMax !== undefined &&
    (stock.debtToEquity === null || stock.debtToEquity > filters.debtToEquityMax)
  )
    return false;
  if (filters.operatingCFPositive && (stock.operatingCF === null || stock.operatingCF <= 0))
    return false;
  if (filters.freeCashFlowPositive && (stock.freeCashFlow === null || stock.freeCashFlow <= 0))
    return false;
  if (
    filters.freeCashFlow3YPositive &&
    stock.freeCashFlow3YTrend !== 'positive'
  )
    return false;

  // Dividend
  if (
    filters.dividendYieldMin !== undefined &&
    (stock.dividendYield === null || stock.dividendYield < filters.dividendYieldMin)
  )
    return false;
  if (
    filters.dividendYieldMax !== undefined &&
    (stock.dividendYield === null || stock.dividendYield > filters.dividendYieldMax)
  )
    return false;
  if (
    filters.consecutiveDividendYearsMin !== undefined &&
    (stock.consecutiveDividendYears === null ||
      stock.consecutiveDividendYears < filters.consecutiveDividendYearsMin)
  )
    return false;
  if (
    filters.payoutRatioMax !== undefined &&
    (stock.payoutRatio === null || stock.payoutRatio > filters.payoutRatioMax)
  )
    return false;
  if (
    filters.payoutRatioMin !== undefined &&
    (stock.payoutRatio === null || stock.payoutRatio < filters.payoutRatioMin)
  )
    return false;

  // Technical
  if (filters.aboveSMA50 && (stock.sma50 === null || stock.price <= stock.sma50)) return false;
  if (filters.aboveSMA200 && (stock.sma200 === null || stock.price <= stock.sma200)) return false;
  if (
    filters.goldenCross &&
    (stock.sma50 === null || stock.sma200 === null || stock.sma50 <= stock.sma200)
  )
    return false;
  if (filters.rsiMin !== undefined && (stock.rsi === null || stock.rsi < filters.rsiMin))
    return false;
  if (filters.rsiMax !== undefined && (stock.rsi === null || stock.rsi > filters.rsiMax))
    return false;
  if (filters.macdBullish && stock.macdSignal !== 'bullish') return false;
  if (
    filters.volumeIncreasePercent !== undefined &&
    (stock.volumeChange === null || stock.volumeChange < filters.volumeIncreasePercent)
  )
    return false;
  if (
    filters.week52HighDistanceMax !== undefined &&
    (stock.week52HighDistance === null ||
      Math.abs(stock.week52HighDistance) > filters.week52HighDistanceMax)
  )
    return false;

  // Market Cap
  if (filters.marketCapMin !== undefined && stock.marketCap < filters.marketCapMin) return false;
  if (filters.marketCapMax !== undefined && stock.marketCap > filters.marketCapMax) return false;
  if (filters.marketCapUSDMin !== undefined && stock.marketCapUSD < filters.marketCapUSDMin)
    return false;
  if (filters.marketCapUSDMax !== undefined && stock.marketCapUSD > filters.marketCapUSDMax)
    return false;

  // Twitter/X Sentiment
  if (filters.twitterMentionTrendPositive && stock.twitterMentionTrend !== 'increasing')
    return false;
  if (
    filters.twitterSentimentFilter &&
    filters.twitterSentimentFilter !== 'any' &&
    stock.twitterSentiment !== filters.twitterSentimentFilter
  )
    return false;
  if (filters.excludeNegativeKeywords && stock.hasNegativeKeywords) return false;

  // Sector
  if (filters.sectors && filters.sectors.length > 0 && !filters.sectors.includes(stock.sector))
    return false;

  return true;
}

// Preset filters
export const PRESET_FILTERS = {
  // 既存のプリセット（基本4つ）
  growth: {
    name: '成長株',
    description: '高成長・高ROE銘柄',
    filters: {
      roeMin: 15,
      epsGrowth3YMin: 10,
      revenueGrowthMin: 10,
      aboveSMA200: true,
    } as ScreenerFilters,
  },
  value: {
    name: '割安株',
    description: '低PER・低PBR銘柄',
    filters: {
      perMax: 15,
      pbrMax: 2,
      pegMax: 1.5,
    } as ScreenerFilters,
  },
  dividend: {
    name: '高配当株',
    description: '配当利回り・連続増配銘柄',
    filters: {
      dividendYieldMin: 3,
      consecutiveDividendYearsMin: 5,
      payoutRatioMax: 80,
    } as ScreenerFilters,
  },
  quality: {
    name: '財務健全株',
    description: '高自己資本・低負債銘柄',
    filters: {
      equityRatioMin: 40,
      currentRatioMin: 1.5,
      debtRatioMax: 50,
      operatingCFPositive: true,
    } as ScreenerFilters,
  },

  // 新規プリセット（X情報込み・プロ投資家向け）
  growthPro: {
    name: '王道成長株',
    description: 'プロ投資家が最も使う長期成長型（X情報込み）',
    filters: {
      marketCapUSDMin: 10000000000, // 10B USD
      revenueGrowthMin: 10,
      epsGrowth3YMin: 12,
      roeMin: 15,
      operatingMarginMin: 15,
      freeCashFlow3YPositive: true,
      debtToEquityMax: 1.0,
      forwardPERMin: 20,
      forwardPERMax: 35,
      pegMax: 1.5,
      aboveSMA200: true,
      goldenCross: true,
      week52HighDistanceMax: 20,
      twitterMentionTrendPositive: true,
      excludeNegativeKeywords: true,
    } as ScreenerFilters,
  },
  valueRecovery: {
    name: '割安回復株',
    description: '割安×回復狙い（リバウンド・ターンアラウンド）',
    filters: {
      marketCapUSDMin: 2000000000, // 2B USD
      revenueGrowthMax: -10, // マイナス10%以内OK
      equityRatioMin: 30,
      perMax: 15,
      pbrMax: 2,
      evEbitdaMax: 10,
      rsiMin: 30,
      rsiMax: 45,
      twitterSentimentFilter: 'neutral',
    } as ScreenerFilters,
  },
  themeGrowth: {
    name: 'テーマ急成長',
    description: 'テーマ株・急成長セクター（AI/半導体/エネルギー等）',
    filters: {
      revenueGrowthMin: 20,
      grossMarginMin: 40,
      week52HighDistanceMax: 10,
      volumeIncreasePercent: 100,
      twitterMentionTrendPositive: true,
      excludeNegativeKeywords: true,
    } as ScreenerFilters,
  },
  dividendDefensive: {
    name: '配当守備株',
    description: '配当・ディフェンシブ（守りの米国株）',
    filters: {
      dividendYieldMin: 3,
      payoutRatioMax: 60,
      operatingCFPositive: true,
      freeCashFlowPositive: true,
      perMax: 20,
      twitterSentimentFilter: 'positive',
    } as ScreenerFilters,
  },
  qualityFilter: {
    name: '地雷除外',
    description: 'X情報で地雷銘柄を除外（超重要フィルター）',
    filters: {
      excludeNegativeKeywords: true,
      twitterSentimentFilter: 'positive',
      operatingCFPositive: true,
      freeCashFlowPositive: true,
      debtToEquityMax: 1.5,
      equityRatioMin: 30,
    } as ScreenerFilters,
  },
};

// Sectors list
export const SECTORS = [
  'Technology',
  'Healthcare',
  'Financial Services',
  'Consumer Cyclical',
  'Consumer Defensive',
  'Industrials',
  'Energy',
  'Basic Materials',
  'Real Estate',
  'Utilities',
  'Communication Services',
];

// Format market cap for display
export function formatMarketCap(value: number): string {
  if (value >= 1e12) return `$${(value / 1e12).toFixed(2)}T`;
  if (value >= 1e9) return `$${(value / 1e9).toFixed(2)}B`;
  if (value >= 1e6) return `$${(value / 1e6).toFixed(2)}M`;
  return `$${value.toLocaleString()}`;
}

// Format percentage
export function formatPercent(value: number | null): string {
  if (value === null) return '-';
  return `${value >= 0 ? '+' : ''}${value.toFixed(2)}%`;
}

// Format number with nulls
export function formatNumber(value: number | null, decimals: number = 2): string {
  if (value === null) return '-';
  return value.toFixed(decimals);
}
