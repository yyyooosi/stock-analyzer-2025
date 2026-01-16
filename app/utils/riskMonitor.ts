// Risk Monitor - S&P 500 Crash Risk Assessment System

export interface RiskIndicator {
  name: string;
  category: "valuation" | "financial" | "macroeconomic" | "market_structure" | "sentiment";
  value: number;
  normalizedScore: number; // 0-100 scale
  direction: "up" | "down" | "neutral"; // Higher value = higher risk
  historicalRange: [number, number];
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
