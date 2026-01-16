// Risk Monitor - S&P 500 Crash Risk Assessment System

export interface RiskIndicator {
  name: string;
  category: "valuation" | "financial" | "macroeconomic" | "market_structure" | "sentiment";
  value: number;
  normalizedScore: number; // 0-100 scale
  direction: "up" | "down" | "neutral"; // Higher value = higher risk
  historicalRange: [number, number];
  description?: string; // 日本語説明
  previousValue?: number; // 前日の値
  changePercent?: number; // 前日比（%）
}

export interface CategoryRiskScore {
  category: "valuation" | "financial" | "macroeconomic" | "market_structure" | "sentiment";
  name: string;
  score: number;
  indicators: RiskIndicator[];
}

export interface RiskAssessment {
  timestamp: Date;
  overallScore: number;
  riskLevel: "low" | "moderate" | "elevated" | "high";
  categories: CategoryRiskScore[];
  topWarnings: RiskIndicator[];
  historicalComparison: {
    dotCom2000: number;
    financialCrisis2008: number;
    pandemic2020: number;
  };
  alerts: string[];
}

export interface CrashSimilarity {
  period: string;
  year: number;
  similarity: number;
  description: string;
}

// Risk scoring logic
export function calculateNormalizedScore(
  value: number,
  min: number,
  max: number,
  inverseScale: boolean = false
): number {
  if (max === min) return 50;
  const normalized = ((value - min) / (max - min)) * 100;
  const clamped = Math.max(0, Math.min(100, normalized));
  return inverseScale ? 100 - clamped : clamped;
}

export function getRiskLevel(score: number): "low" | "moderate" | "elevated" | "high" {
  if (score < 30) return "low";
  if (score < 50) return "moderate";
  if (score < 70) return "elevated";
  return "high";
}

export function getCategoryName(
  category: "valuation" | "financial" | "macroeconomic" | "market_structure" | "sentiment"
): string {
  const names: Record<string, string> = {
    valuation: "Valuation Metrics",
    financial: "Financial Conditions",
    macroeconomic: "Macroeconomic Indicators",
    market_structure: "Market Structure",
    sentiment: "Sentiment Indicators",
  };
  return names[category] || category;
}

// Historical crash similarity (simplified scoring)
export function calculateCrashSimilarities(
  indicators: RiskIndicator[]
): RiskAssessment["historicalComparison"] {
  const avgScore = indicators.reduce((sum, ind) => sum + ind.normalizedScore, 0) / indicators.length;

  return {
    dotCom2000: calculateSimilarityScore(avgScore, "dotcom"),
    financialCrisis2008: calculateSimilarityScore(avgScore, "financial"),
    pandemic2020: calculateSimilarityScore(avgScore, "pandemic"),
  };
}

function calculateSimilarityScore(
  currentScore: number,
  period: "dotcom" | "financial" | "pandemic"
): number {
  // Historical risk scores (simplified)
  const historicalScores = {
    dotcom: 85,
    financial: 90,
    pandemic: 65,
  };

  const historical = historicalScores[period];
  const difference = Math.abs(currentScore - historical);
  return Math.max(0, 100 - difference);
}

// Alert generation
export function generateAlerts(assessment: RiskAssessment): string[] {
  const alerts: string[] = [];

  if (assessment.overallScore >= 80) {
    alerts.push("🚨 Critical risk level detected");
  }

  if (assessment.overallScore >= 60) {
    alerts.push("⚠️ Market risk elevated - consider defensive positioning");
  }

  const valuationCategory = assessment.categories.find((c) => c.category === "valuation");
  if (valuationCategory && valuationCategory.score >= 75) {
    alerts.push("📊 Valuation metrics at concerning levels");
  }

  const sentimentCategory = assessment.categories.find((c) => c.category === "sentiment");
  if (sentimentCategory && sentimentCategory.score >= 70) {
    alerts.push("😟 Negative sentiment indicators detected");
  }

  return alerts;
}

// 指標の日本語説明
export function getIndicatorDescription(indicatorName: string): string {
  const descriptions: Record<string, string> = {
    "Shiller P/E Ratio": "シラー株価収益率。過去10年間の平均利益と比較した株価水準を示す。高いほどバブル的。",
    "Price-to-Sales Ratio": "株価売上高倍率。利益ではなく売上高を基準とした評価指標。粉飾決算の影響を受けにくい。",
    "Buffett Indicator": "バフェット指標。全市場の時価総額をGDPで割った値。160%以上は過熱、80%以下は割安の目安。",
    "Federal Funds Rate": "米国の政策金利。金融引き締めが強まると株式市場に圧力。現在の水準を反映。",
    "Credit Spreads": "クレジットスプレッド。投資適格債と高リスク債の利回り差。拡大は金融ストレスを示唆。",
    "M2 Money Supply": "マネーサプライM2。流動性の広い定義。M2の減少は金融引き締めを示す。",
    "Unemployment Rate": "失業率。高い値は経済減速の兆候。低すぎるとインフレ圧力増加。",
    "CPI (Inflation)": "消費者物価指数。インフレ率を示す。高インフレはFRBの金融引き締めを招く。",
    "Yield Curve Inversion": "イールドカーブ。長期と短期金利の差。逆転（負値）は景気後退の強い警告信号。",
    "VIX Index": "恐怖指数。市場の変動性と投資家の不安度を示す。20以上で市場が神経質。",
    "Index Concentration": "指数集中度。時価総額上位企業の割合。高いほど少数企業に依存。",
    "Leveraged ETF Balance": "レバレッジ型ETF残高。個人投資家の過度なレバレッジ使用を示唆。",
    "High Yield Spread": "ハイイールドスプレッド。投資適格債との利回り差。拡大はリスク回避を示す。",
    "Earnings Yield Spread": "益利回りスプレッド。株式の益利回りと国債利回りの差。縮小は相対的に株が割高。",
  };

  return descriptions[indicatorName] || "詳細情報なし";
}
