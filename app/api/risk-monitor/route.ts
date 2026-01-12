import { NextResponse } from 'next/server';
import {
  RiskAssessment,
  RiskIndicator,
  CategoryScore,
  Alert,
  determineRiskLevel,
  calculateCategoryScore,
  calculateOverallScore,
  calculateHistoricalSimilarity,
  CATEGORY_CONFIG,
} from '@/app/utils/riskMonitor';

/**
 * S&P500大暴落リスク監視API
 * 現在のリスク評価を返す
 */

// サンプルデータ生成（実際のAPIと統合する前の暫定実装）
function generateSampleIndicators(): {
  valuation: RiskIndicator[];
  financial: RiskIndicator[];
  macro: RiskIndicator[];
  market: RiskIndicator[];
  sentiment: RiskIndicator[];
} {
  const now = new Date().toISOString();

  // バリュエーション指標
  const valuation: RiskIndicator[] = [
    {
      id: 'cape',
      category: 'valuation',
      name: 'CAPE (Shiller PER)',
      description: 'S&P500の景気調整後PER。過去10年の平均利益に基づく',
      currentValue: 32.5,
      normalizedScore: 75,
      threshold: 30,
      isWarning: true,
      historicalPercentile: 85,
      trend: 'stable',
      lastUpdated: now,
    },
    {
      id: 'psr',
      category: 'valuation',
      name: 'PSR (株価売上倍率)',
      description: 'S&P500の時価総額を売上高で割った値',
      currentValue: 2.8,
      normalizedScore: 68,
      threshold: 2.5,
      isWarning: true,
      historicalPercentile: 78,
      trend: 'rising',
      lastUpdated: now,
    },
    {
      id: 'buffett-indicator',
      category: 'valuation',
      name: 'バフェット指数',
      description: '米国株式時価総額をGDPで割った値',
      currentValue: 185,
      normalizedScore: 82,
      threshold: 120,
      isWarning: true,
      historicalPercentile: 92,
      trend: 'rising',
      lastUpdated: now,
    },
    {
      id: 'earnings-yield-spread',
      category: 'valuation',
      name: '株益利回りスプレッド',
      description: 'S&P500益利回り - 10年国債利回り',
      currentValue: -1.2,
      normalizedScore: 55,
      threshold: 0,
      isWarning: false,
      historicalPercentile: 62,
      trend: 'falling',
      lastUpdated: now,
    },
  ];

  // 金融・信用指標
  const financial: RiskIndicator[] = [
    {
      id: 'fed-funds-rate',
      category: 'financial',
      name: 'FF金利',
      description: '米国の政策金利',
      currentValue: 5.33,
      normalizedScore: 72,
      threshold: 5.0,
      isWarning: true,
      historicalPercentile: 80,
      trend: 'stable',
      lastUpdated: now,
    },
    {
      id: 'credit-spread',
      category: 'financial',
      name: 'クレジットスプレッド',
      description: '投資適格社債と国債の利回り差',
      currentValue: 1.45,
      normalizedScore: 42,
      threshold: 2.0,
      isWarning: false,
      historicalPercentile: 45,
      trend: 'stable',
      lastUpdated: now,
    },
    {
      id: 'hy-yield',
      category: 'financial',
      name: 'HY債利回り',
      description: 'ハイイールド債の利回り',
      currentValue: 8.2,
      normalizedScore: 58,
      threshold: 9.0,
      isWarning: false,
      historicalPercentile: 65,
      trend: 'rising',
      lastUpdated: now,
    },
    {
      id: 'm2-growth',
      category: 'financial',
      name: 'M2増加率',
      description: 'マネーサプライの前年同月比増加率',
      currentValue: -2.1,
      normalizedScore: 65,
      threshold: 0,
      isWarning: true,
      historicalPercentile: 88,
      trend: 'falling',
      lastUpdated: now,
    },
  ];

  // マクロ経済指標
  const macro: RiskIndicator[] = [
    {
      id: 'cpi',
      category: 'macro',
      name: 'CPI (消費者物価指数)',
      description: '前年同月比のインフレ率',
      currentValue: 3.4,
      normalizedScore: 58,
      threshold: 4.0,
      isWarning: false,
      historicalPercentile: 70,
      trend: 'falling',
      lastUpdated: now,
    },
    {
      id: 'unemployment',
      category: 'macro',
      name: '失業率',
      description: '米国の失業率',
      currentValue: 3.8,
      normalizedScore: 35,
      threshold: 4.5,
      isWarning: false,
      historicalPercentile: 30,
      trend: 'rising',
      lastUpdated: now,
    },
    {
      id: 'ism-manufacturing',
      category: 'macro',
      name: 'ISM製造業指数',
      description: '製造業の景況感を示す指数（50が分岐点）',
      currentValue: 48.2,
      normalizedScore: 62,
      threshold: 50,
      isWarning: true,
      historicalPercentile: 68,
      trend: 'falling',
      lastUpdated: now,
    },
    {
      id: 'yield-curve',
      category: 'macro',
      name: 'イールドカーブ',
      description: '10年債利回り - 2年債利回り',
      currentValue: -0.45,
      normalizedScore: 78,
      threshold: 0,
      isWarning: true,
      historicalPercentile: 85,
      trend: 'stable',
      lastUpdated: now,
    },
  ];

  // 市場構造指標
  const market: RiskIndicator[] = [
    {
      id: 'vix',
      category: 'market',
      name: 'VIX (恐怖指数)',
      description: 'S&P500のボラティリティ指数',
      currentValue: 13.5,
      normalizedScore: 25,
      threshold: 20,
      isWarning: false,
      historicalPercentile: 20,
      trend: 'stable',
      lastUpdated: now,
    },
    {
      id: 'advance-decline',
      category: 'market',
      name: '騰落銘柄比率',
      description: '上昇銘柄数 ÷ 下落銘柄数',
      currentValue: 0.85,
      normalizedScore: 48,
      threshold: 1.0,
      isWarning: false,
      historicalPercentile: 45,
      trend: 'falling',
      lastUpdated: now,
    },
    {
      id: 'index-concentration',
      category: 'market',
      name: '指数集中度',
      description: 'トップ10銘柄の時価総額シェア',
      currentValue: 32.5,
      normalizedScore: 88,
      threshold: 25,
      isWarning: true,
      historicalPercentile: 95,
      trend: 'rising',
      lastUpdated: now,
    },
    {
      id: 'leveraged-etf',
      category: 'market',
      name: 'レバレッジETF残高',
      description: 'レバレッジETFの運用資産残高（10億ドル）',
      currentValue: 125,
      normalizedScore: 72,
      threshold: 100,
      isWarning: true,
      historicalPercentile: 82,
      trend: 'rising',
      lastUpdated: now,
    },
  ];

  // センチメント指標
  const sentiment: RiskIndicator[] = [
    {
      id: 'aaii-bullish',
      category: 'sentiment',
      name: 'AAII強気比率',
      description: '個人投資家の強気比率',
      currentValue: 52.5,
      normalizedScore: 65,
      threshold: 50,
      isWarning: true,
      historicalPercentile: 75,
      trend: 'rising',
      lastUpdated: now,
    },
    {
      id: 'put-call-ratio',
      category: 'sentiment',
      name: 'Put/Call Ratio',
      description: 'プットオプション取引量 ÷ コールオプション取引量',
      currentValue: 0.68,
      normalizedScore: 58,
      threshold: 0.7,
      isWarning: false,
      historicalPercentile: 55,
      trend: 'stable',
      lastUpdated: now,
    },
    {
      id: 'margin-debt',
      category: 'sentiment',
      name: '信用取引残高',
      description: '証券口座の信用取引残高（10億ドル）',
      currentValue: 685,
      normalizedScore: 70,
      threshold: 600,
      isWarning: true,
      historicalPercentile: 78,
      trend: 'rising',
      lastUpdated: now,
    },
  ];

  return { valuation, financial, macro, market, sentiment };
}

// カテゴリスコア計算
function calculateCategoryScores(indicators: {
  valuation: RiskIndicator[];
  financial: RiskIndicator[];
  macro: RiskIndicator[];
  market: RiskIndicator[];
  sentiment: RiskIndicator[];
}): CategoryScore[] {
  const categories: Array<keyof typeof indicators> = [
    'valuation',
    'financial',
    'macro',
    'market',
    'sentiment',
  ];

  return categories.map((category) => {
    const categoryIndicators = indicators[category];
    const score = calculateCategoryScore(categoryIndicators);
    const warningCount = categoryIndicators.filter((ind) => ind.isWarning).length;

    return {
      category,
      categoryName: CATEGORY_CONFIG[category].name,
      score,
      level: determineRiskLevel(score),
      warningCount,
      totalIndicators: categoryIndicators.length,
    };
  });
}

// トップ警告を取得
function getTopWarnings(indicators: {
  valuation: RiskIndicator[];
  financial: RiskIndicator[];
  macro: RiskIndicator[];
  market: RiskIndicator[];
  sentiment: RiskIndicator[];
}): RiskIndicator[] {
  const allIndicators = [
    ...indicators.valuation,
    ...indicators.financial,
    ...indicators.macro,
    ...indicators.market,
    ...indicators.sentiment,
  ];

  return allIndicators
    .filter((ind) => ind.isWarning)
    .sort((a, b) => b.normalizedScore - a.normalizedScore)
    .slice(0, 5);
}

// アラート生成
function generateAlerts(
  overallScore: number,
  categoryScores: CategoryScore[],
  topWarnings: RiskIndicator[]
): Alert[] {
  const alerts: Alert[] = [];
  const now = new Date().toISOString();

  // 総合スコアに基づくアラート
  if (overallScore >= 80) {
    alerts.push({
      id: `alert-overall-${Date.now()}`,
      timestamp: now,
      severity: 'danger',
      category: 'valuation',
      message: '⚠️ 市場は歴史的な危険水準に達しています。複数の指標が暴落前の水準を示しています。',
      indicators: topWarnings.map((w) => w.id),
    });
  } else if (overallScore >= 60) {
    alerts.push({
      id: `alert-overall-${Date.now()}`,
      timestamp: now,
      severity: 'warning',
      category: 'valuation',
      message: '⚠️ 市場に警戒信号が出ています。リスク管理を強化してください。',
      indicators: topWarnings.map((w) => w.id),
    });
  }

  // カテゴリ別アラート
  categoryScores.forEach((cat) => {
    if (cat.score >= 75 && cat.warningCount >= 3) {
      alerts.push({
        id: `alert-${cat.category}-${Date.now()}`,
        timestamp: now,
        severity: cat.level,
        category: cat.category,
        message: `${CATEGORY_CONFIG[cat.category].name}カテゴリで複数の危険信号が検出されました（${cat.warningCount}/${cat.totalIndicators}指標）`,
        indicators: [],
      });
    }
  });

  // 特定の重要指標アラート
  if (topWarnings.some((w) => w.id === 'buffett-indicator' && w.normalizedScore >= 80)) {
    alerts.push({
      id: `alert-buffett-${Date.now()}`,
      timestamp: now,
      severity: 'warning',
      category: 'valuation',
      message: 'バフェット指数が危険水準を大きく超過しています。市場全体が過熱している可能性があります。',
      indicators: ['buffett-indicator'],
    });
  }

  if (topWarnings.some((w) => w.id === 'yield-curve' && w.currentValue < 0)) {
    alerts.push({
      id: `alert-yield-curve-${Date.now()}`,
      timestamp: now,
      severity: 'warning',
      category: 'macro',
      message: 'イールドカーブが逆転しています。過去、景気後退の先行指標となっています。',
      indicators: ['yield-curve'],
    });
  }

  return alerts;
}

export async function GET() {
  try {
    const indicators = generateSampleIndicators();
    const categoryScores = calculateCategoryScores(indicators);
    const overallScore = calculateOverallScore(categoryScores);
    const overallLevel = determineRiskLevel(overallScore);
    const topWarnings = getTopWarnings(indicators);

    // 過去の暴落局面との類似度計算（簡易版）
    const currentScores = categoryScores.map((c) => c.score);

    // 2000年ITバブル崩壊時のパターン（高バリュエーション、楽観センチメント）
    const pattern2000 = [85, 45, 50, 60, 80]; // [valuation, financial, macro, market, sentiment]
    const similarTo2000 = calculateHistoricalSimilarity(currentScores, pattern2000);

    // 2008年リーマンショック時のパターン（高信用リスク、金融逼迫）
    const pattern2008 = [70, 90, 75, 65, 55];
    const similarTo2008 = calculateHistoricalSimilarity(currentScores, pattern2008);

    // 2020年コロナショック時のパターン（市場構造の急変）
    const pattern2020 = [55, 60, 70, 85, 45];
    const similarTo2020 = calculateHistoricalSimilarity(currentScores, pattern2020);

    const alerts = generateAlerts(overallScore, categoryScores, topWarnings);

    const assessment: RiskAssessment = {
      timestamp: new Date().toISOString(),
      overallScore,
      overallLevel,
      categoryScores,
      topWarnings,
      historicalComparison: {
        similarTo2000,
        similarTo2008,
        similarTo2020,
      },
      alerts,
    };

    return NextResponse.json({
      success: true,
      data: assessment,
      indicators,
    });
  } catch (error) {
    console.error('Risk monitor API error:', error);
    return NextResponse.json(
      { success: false, error: 'リスク評価の取得中にエラーが発生しました' },
      { status: 500 }
    );
  }
}
