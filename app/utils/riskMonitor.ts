/**
 * S&P500 大暴落リスク監視システム
 * データ型定義とスコアリングロジック
 */

// 危険度レベル
export type RiskLevel = 'safe' | 'caution' | 'warning' | 'danger';

// 指標カテゴリ
export type IndicatorCategory =
  | 'valuation'      // バリュエーション
  | 'financial'      // 金融・信用
  | 'macro'          // マクロ経済
  | 'market'         // 市場構造
  | 'sentiment';     // センチメント

// 個別指標データ
export interface RiskIndicator {
  id: string;
  category: IndicatorCategory;
  name: string;
  description: string;
  currentValue: number;
  normalizedScore: number; // 0-100
  threshold: number;       // 危険水準の閾値
  isWarning: boolean;      // 警告状態かどうか
  historicalPercentile: number; // 過去データでの位置（パーセンタイル）
  trend: 'rising' | 'falling' | 'stable'; // トレンド
  lastUpdated: string;
}

// バリュエーション指標
export interface ValuationIndicators {
  cape: RiskIndicator;           // Shiller PER
  psr: RiskIndicator;            // 株価売上倍率
  buffettIndicator: RiskIndicator; // 時価総額/GDP
  earningsYieldSpread: RiskIndicator; // 株益利回り - 10年金利
}

// 金融・信用指標
export interface FinancialIndicators {
  fedFundsRate: RiskIndicator;     // FF金利
  creditSpread: RiskIndicator;     // クレジットスプレッド
  hyYield: RiskIndicator;          // ハイイールド債利回り
  m2GrowthRate: RiskIndicator;     // M2増加率
}

// マクロ経済指標
export interface MacroIndicators {
  cpi: RiskIndicator;              // インフレ率
  unemploymentRate: RiskIndicator; // 失業率
  ismManufacturing: RiskIndicator; // ISM製造業指数
  yieldCurve: RiskIndicator;       // イールドカーブ（10年-2年）
}

// 市場構造指標
export interface MarketIndicators {
  vix: RiskIndicator;              // ボラティリティ指数
  advanceDecline: RiskIndicator;   // 上昇/下落銘柄数
  indexConcentration: RiskIndicator; // 指数集中度
  leveragedETF: RiskIndicator;     // レバレッジETF残高
}

// センチメント指標
export interface SentimentIndicators {
  aaiiBullish: RiskIndicator;      // AAII強気比率
  putCallRatio: RiskIndicator;     // Put/Call比率
  marginDebt: RiskIndicator;       // 信用取引残高
}

// カテゴリ別スコア
export interface CategoryScore {
  category: IndicatorCategory;
  categoryName: string;
  score: number;           // 0-100
  level: RiskLevel;
  warningCount: number;    // 警告状態の指標数
  totalIndicators: number;
}

// 総合リスク評価
export interface RiskAssessment {
  timestamp: string;
  overallScore: number;    // 0-100
  overallLevel: RiskLevel;
  categoryScores: CategoryScore[];
  topWarnings: RiskIndicator[]; // 最も危険な指標トップ5
  historicalComparison: {
    similarTo2000: number; // 2000年ITバブル崩壊との類似度
    similarTo2008: number; // 2008年リーマンショックとの類似度
    similarTo2020: number; // 2020年コロナショックとの類似度
  };
  alerts: Alert[];
}

// アラート
export interface Alert {
  id: string;
  timestamp: string;
  severity: RiskLevel;
  category: IndicatorCategory;
  message: string;
  indicators: string[]; // 関連する指標ID
}

// リスクレベル判定関数
export function determineRiskLevel(score: number): RiskLevel {
  if (score >= 81) return 'danger';
  if (score >= 61) return 'warning';
  if (score >= 31) return 'caution';
  return 'safe';
}

// リスクレベル表示設定
export const RISK_LEVEL_CONFIG = {
  safe: {
    label: '安定',
    emoji: '🟢',
    color: '#10b981',
    bgColor: '#d1fae5',
    description: '市場は正常な状態です',
  },
  caution: {
    label: '注意',
    emoji: '🟡',
    color: '#f59e0b',
    bgColor: '#fef3c7',
    description: '一部に注意が必要な兆候があります',
  },
  warning: {
    label: '警戒',
    emoji: '🟠',
    color: '#f97316',
    bgColor: '#ffedd5',
    description: '複数の危険信号が検出されています',
  },
  danger: {
    label: '危険',
    emoji: '🔴',
    color: '#ef4444',
    bgColor: '#fee2e2',
    description: '歴史的な危険水準に達しています',
  },
} as const;

// カテゴリ表示設定
export const CATEGORY_CONFIG = {
  valuation: {
    name: 'バリュエーション',
    icon: '📊',
    description: '株価の割高・割安を示す指標',
  },
  financial: {
    name: '金融・信用',
    icon: '💰',
    description: '金利・信用環境を示す指標',
  },
  macro: {
    name: 'マクロ経済',
    icon: '🌍',
    description: '景気・インフレなどの経済指標',
  },
  market: {
    name: '市場構造',
    icon: '📈',
    description: '市場の健全性を示す内部指標',
  },
  sentiment: {
    name: 'センチメント',
    icon: '🧠',
    description: '投資家心理を示す指標',
  },
} as const;

/**
 * 正規化スコア計算
 * 過去データのパーセンタイルに基づいて0-100にスケール
 */
export function calculateNormalizedScore(
  currentValue: number,
  historicalData: { min: number; max: number; percentile90: number }
): number {
  const { min, max, percentile90 } = historicalData;

  // 値が高いほど危険な指標の場合
  if (currentValue >= percentile90) return 90;
  if (currentValue <= min) return 0;

  return Math.round(((currentValue - min) / (max - min)) * 100);
}

/**
 * カテゴリスコア計算
 */
export function calculateCategoryScore(indicators: RiskIndicator[]): number {
  if (indicators.length === 0) return 0;

  const sum = indicators.reduce((acc, ind) => acc + ind.normalizedScore, 0);
  return Math.round(sum / indicators.length);
}

/**
 * 総合スコア計算
 * カテゴリ別スコアの加重平均
 */
export function calculateOverallScore(categoryScores: CategoryScore[]): number {
  // カテゴリ別の重み付け（合計100%）
  const weights: Record<string, number> = {
    valuation: 0.25,
    financial: 0.25,
    macro: 0.20,
    market: 0.15,
    sentiment: 0.15,
  };

  const weightedSum = categoryScores.reduce((acc, cat) => {
    const weight = weights[cat.category] || 0;
    return acc + cat.score * weight;
  }, 0);

  return Math.round(weightedSum);
}

/**
 * 過去の暴落局面との類似度計算
 * コサイン類似度を使用
 */
export function calculateHistoricalSimilarity(
  currentIndicators: number[],
  historicalIndicators: number[]
): number {
  if (currentIndicators.length !== historicalIndicators.length) return 0;

  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < currentIndicators.length; i++) {
    dotProduct += currentIndicators[i] * historicalIndicators[i];
    normA += currentIndicators[i] ** 2;
    normB += historicalIndicators[i] ** 2;
  }

  if (normA === 0 || normB === 0) return 0;

  const similarity = dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
  return Math.round(similarity * 100);
}
