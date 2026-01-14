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
import { fetchMacroEconomicData, fetchCreditSpread, fetchHYYield } from '@/app/utils/fredAPI';
import {
  fetchCAPE,
  fetchPSR,
  fetchBuffettIndicator,
  fetchEarningsYieldSpread,
  fetchVIX,
  fetchIndexConcentration,
  fetchLeveragedETFAssets,
  fetchMarginDebt,
} from '@/app/utils/marketData';
import { shouldNotify, sendNotifications } from '@/app/utils/notifications';

/**
 * S&P500大暴落リスク監視API
 * 実際のデータソースから現在のリスク評価を返す
 */

// 最後の通知時刻を記録（メモリ内、実際にはDBやKVストアを使用すべき）
let lastNotificationTime: string | undefined = undefined;

// 正規化スコア計算用の歴史的範囲
const HISTORICAL_RANGES = {
  cape: { min: 10, max: 45, threshold: 30, percentile90: 35 },
  psr: { min: 0.5, max: 3.5, threshold: 2.5, percentile90: 3.0 },
  buffettIndicator: { min: 50, max: 200, threshold: 120, percentile90: 160 },
  earningsYieldSpread: { min: -3, max: 5, threshold: 0, percentile90: -1 },
  fedFundsRate: { min: 0, max: 6, threshold: 5.0, percentile90: 5.5 },
  creditSpread: { min: 0.5, max: 3.5, threshold: 2.0, percentile90: 2.5 },
  hyYield: { min: 4, max: 12, threshold: 9.0, percentile90: 10 },
  m2Growth: { min: -5, max: 15, threshold: 0, percentile90: -2 },
  cpi: { min: 0, max: 8, threshold: 4.0, percentile90: 5 },
  unemployment: { min: 3, max: 10, threshold: 4.5, percentile90: 5 },
  yieldCurve: { min: -1.5, max: 3, threshold: 0, percentile90: -0.5 },
  vix: { min: 10, max: 40, threshold: 20, percentile90: 25 },
  indexConcentration: { min: 15, max: 40, threshold: 25, percentile90: 32 },
  leveragedETF: { min: 20, max: 200, threshold: 100, percentile90: 150 },
  marginDebt: { min: 200, max: 900, threshold: 600, percentile90: 750 },
};

/**
 * 値を正規化スコアに変換
 */
function normalizeValue(
  value: number,
  range: { min: number; max: number; percentile90: number },
  isHigherWorse: boolean = true
): number {
  if (isHigherWorse) {
    if (value >= range.percentile90) return 90 + ((value - range.percentile90) / (range.max - range.percentile90)) * 10;
    if (value <= range.min) return 0;
    return ((value - range.min) / (range.max - range.min)) * 100;
  } else {
    // 値が低いほど危険な指標（例：イールドカーブ）
    if (value <= range.min) return 100;
    if (value >= range.max) return 0;
    return ((range.max - value) / (range.max - range.min)) * 100;
  }
}

/**
 * パーセンタイルを計算
 */
function calculatePercentile(value: number, range: { min: number; max: number }): number {
  if (value <= range.min) return 0;
  if (value >= range.max) return 100;
  return Math.round(((value - range.min) / (range.max - range.min)) * 100);
}

/**
 * 実際のデータから指標を生成
 */
async function generateRealIndicators(): Promise<{
  valuation: RiskIndicator[];
  financial: RiskIndicator[];
  macro: RiskIndicator[];
  market: RiskIndicator[];
  sentiment: RiskIndicator[];
} | null> {
  const now = new Date().toISOString();
  const fredApiKey = process.env.FRED_API_KEY;

  try {
    // 並列でデータ取得
    const [
      macroData,
      creditSpread,
      hyYield,
      cape,
      psr,
      buffettIndicator,
      vix,
      indexConcentration,
      leveragedETF,
      marginDebt,
    ] = await Promise.all([
      fetchMacroEconomicData(fredApiKey),
      fetchCreditSpread(fredApiKey),
      fetchHYYield(fredApiKey),
      fetchCAPE(),
      fetchPSR(),
      fetchBuffettIndicator(fredApiKey),
      fetchVIX(),
      fetchIndexConcentration(),
      fetchLeveragedETFAssets(),
      fetchMarginDebt(fredApiKey),
    ]);

    // データが十分に取得できない場合はnullを返す
    if (!macroData) {
      console.warn('Insufficient macro data, falling back to sample data');
      return null;
    }

    // バリュエーション指標
    const valuation: RiskIndicator[] = [];

    if (cape !== null) {
      const score = normalizeValue(cape, HISTORICAL_RANGES.cape);
      valuation.push({
        id: 'cape',
        category: 'valuation',
        name: 'CAPE (Shiller PER)',
        description: 'S&P500の景気調整後PER。過去10年の平均利益に基づく',
        currentValue: cape,
        normalizedScore: Math.round(score),
        threshold: HISTORICAL_RANGES.cape.threshold,
        isWarning: cape > HISTORICAL_RANGES.cape.threshold,
        historicalPercentile: calculatePercentile(cape, HISTORICAL_RANGES.cape),
        trend: 'stable',
        lastUpdated: now,
      });
    }

    if (psr !== null) {
      const score = normalizeValue(psr, HISTORICAL_RANGES.psr);
      valuation.push({
        id: 'psr',
        category: 'valuation',
        name: 'PSR (株価売上倍率)',
        description: 'S&P500の時価総額を売上高で割った値',
        currentValue: psr,
        normalizedScore: Math.round(score),
        threshold: HISTORICAL_RANGES.psr.threshold,
        isWarning: psr > HISTORICAL_RANGES.psr.threshold,
        historicalPercentile: calculatePercentile(psr, HISTORICAL_RANGES.psr),
        trend: 'stable',
        lastUpdated: now,
      });
    }

    if (buffettIndicator !== null) {
      const score = normalizeValue(buffettIndicator, HISTORICAL_RANGES.buffettIndicator);
      valuation.push({
        id: 'buffett-indicator',
        category: 'valuation',
        name: 'バフェット指数',
        description: '米国株式時価総額をGDPで割った値',
        currentValue: buffettIndicator,
        normalizedScore: Math.round(score),
        threshold: HISTORICAL_RANGES.buffettIndicator.threshold,
        isWarning: buffettIndicator > HISTORICAL_RANGES.buffettIndicator.threshold,
        historicalPercentile: calculatePercentile(buffettIndicator, HISTORICAL_RANGES.buffettIndicator),
        trend: 'stable',
        lastUpdated: now,
      });
    }

    const earningsYieldSpread = await fetchEarningsYieldSpread(macroData.yield10Y);
    if (earningsYieldSpread !== null) {
      const score = normalizeValue(earningsYieldSpread, HISTORICAL_RANGES.earningsYieldSpread, false);
      valuation.push({
        id: 'earnings-yield-spread',
        category: 'valuation',
        name: '株益利回りスプレッド',
        description: 'S&P500益利回り - 10年国債利回り',
        currentValue: earningsYieldSpread,
        normalizedScore: Math.round(score),
        threshold: HISTORICAL_RANGES.earningsYieldSpread.threshold,
        isWarning: earningsYieldSpread < HISTORICAL_RANGES.earningsYieldSpread.threshold,
        historicalPercentile: 100 - calculatePercentile(earningsYieldSpread, HISTORICAL_RANGES.earningsYieldSpread),
        trend: 'stable',
        lastUpdated: now,
      });
    }

    // 金融・信用指標
    const financial: RiskIndicator[] = [];

    if (macroData.fedFundsRate !== null) {
      const score = normalizeValue(macroData.fedFundsRate, HISTORICAL_RANGES.fedFundsRate);
      financial.push({
        id: 'fed-funds-rate',
        category: 'financial',
        name: 'FF金利',
        description: '米国の政策金利',
        currentValue: macroData.fedFundsRate,
        normalizedScore: Math.round(score),
        threshold: HISTORICAL_RANGES.fedFundsRate.threshold,
        isWarning: macroData.fedFundsRate > HISTORICAL_RANGES.fedFundsRate.threshold,
        historicalPercentile: calculatePercentile(macroData.fedFundsRate, HISTORICAL_RANGES.fedFundsRate),
        trend: 'stable',
        lastUpdated: now,
      });
    }

    if (creditSpread !== null) {
      const score = normalizeValue(creditSpread, HISTORICAL_RANGES.creditSpread);
      financial.push({
        id: 'credit-spread',
        category: 'financial',
        name: 'クレジットスプレッド',
        description: '投資適格社債と国債の利回り差',
        currentValue: creditSpread,
        normalizedScore: Math.round(score),
        threshold: HISTORICAL_RANGES.creditSpread.threshold,
        isWarning: creditSpread > HISTORICAL_RANGES.creditSpread.threshold,
        historicalPercentile: calculatePercentile(creditSpread, HISTORICAL_RANGES.creditSpread),
        trend: 'stable',
        lastUpdated: now,
      });
    }

    if (hyYield !== null) {
      const score = normalizeValue(hyYield, HISTORICAL_RANGES.hyYield);
      financial.push({
        id: 'hy-yield',
        category: 'financial',
        name: 'HY債利回り',
        description: 'ハイイールド債の利回り',
        currentValue: hyYield,
        normalizedScore: Math.round(score),
        threshold: HISTORICAL_RANGES.hyYield.threshold,
        isWarning: hyYield > HISTORICAL_RANGES.hyYield.threshold,
        historicalPercentile: calculatePercentile(hyYield, HISTORICAL_RANGES.hyYield),
        trend: 'stable',
        lastUpdated: now,
      });
    }

    if (macroData.m2Growth !== null) {
      const score = normalizeValue(macroData.m2Growth, HISTORICAL_RANGES.m2Growth, false);
      financial.push({
        id: 'm2-growth',
        category: 'financial',
        name: 'M2増加率',
        description: 'マネーサプライの前年同月比増加率',
        currentValue: macroData.m2Growth,
        normalizedScore: Math.round(score),
        threshold: HISTORICAL_RANGES.m2Growth.threshold,
        isWarning: macroData.m2Growth < HISTORICAL_RANGES.m2Growth.threshold,
        historicalPercentile: 100 - calculatePercentile(macroData.m2Growth, HISTORICAL_RANGES.m2Growth),
        trend: macroData.m2Growth < 0 ? 'falling' : 'rising',
        lastUpdated: now,
      });
    }

    // マクロ経済指標
    const macro: RiskIndicator[] = [];

    if (macroData.cpi !== null) {
      const score = normalizeValue(macroData.cpi, HISTORICAL_RANGES.cpi);
      macro.push({
        id: 'cpi',
        category: 'macro',
        name: 'CPI (消費者物価指数)',
        description: '前年同月比のインフレ率',
        currentValue: macroData.cpi,
        normalizedScore: Math.round(score),
        threshold: HISTORICAL_RANGES.cpi.threshold,
        isWarning: macroData.cpi > HISTORICAL_RANGES.cpi.threshold,
        historicalPercentile: calculatePercentile(macroData.cpi, HISTORICAL_RANGES.cpi),
        trend: macroData.cpi > 3 ? 'rising' : 'falling',
        lastUpdated: now,
      });
    }

    if (macroData.unemploymentRate !== null) {
      const score = normalizeValue(macroData.unemploymentRate, HISTORICAL_RANGES.unemployment);
      macro.push({
        id: 'unemployment',
        category: 'macro',
        name: '失業率',
        description: '米国の失業率',
        currentValue: macroData.unemploymentRate,
        normalizedScore: Math.round(score),
        threshold: HISTORICAL_RANGES.unemployment.threshold,
        isWarning: macroData.unemploymentRate > HISTORICAL_RANGES.unemployment.threshold,
        historicalPercentile: calculatePercentile(macroData.unemploymentRate, HISTORICAL_RANGES.unemployment),
        trend: macroData.unemploymentRate > 4 ? 'rising' : 'falling',
        lastUpdated: now,
      });
    }

    if (macroData.yieldCurve !== null) {
      const score = normalizeValue(macroData.yieldCurve, HISTORICAL_RANGES.yieldCurve, false);
      macro.push({
        id: 'yield-curve',
        category: 'macro',
        name: 'イールドカーブ',
        description: '10年債利回り - 2年債利回り',
        currentValue: macroData.yieldCurve,
        normalizedScore: Math.round(score),
        threshold: HISTORICAL_RANGES.yieldCurve.threshold,
        isWarning: macroData.yieldCurve < HISTORICAL_RANGES.yieldCurve.threshold,
        historicalPercentile: 100 - calculatePercentile(macroData.yieldCurve, HISTORICAL_RANGES.yieldCurve),
        trend: macroData.yieldCurve < 0 ? 'falling' : 'rising',
        lastUpdated: now,
      });
    }

    // 市場構造指標
    const market: RiskIndicator[] = [];

    const vixValue = vix || macroData.vix;
    if (vixValue !== null) {
      const score = normalizeValue(vixValue, HISTORICAL_RANGES.vix);
      market.push({
        id: 'vix',
        category: 'market',
        name: 'VIX (恐怖指数)',
        description: 'S&P500のボラティリティ指数',
        currentValue: vixValue,
        normalizedScore: Math.round(score),
        threshold: HISTORICAL_RANGES.vix.threshold,
        isWarning: vixValue > HISTORICAL_RANGES.vix.threshold,
        historicalPercentile: calculatePercentile(vixValue, HISTORICAL_RANGES.vix),
        trend: vixValue > 20 ? 'rising' : 'stable',
        lastUpdated: now,
      });
    }

    if (indexConcentration !== null) {
      const score = normalizeValue(indexConcentration, HISTORICAL_RANGES.indexConcentration);
      market.push({
        id: 'index-concentration',
        category: 'market',
        name: '指数集中度',
        description: 'トップ10銘柄の時価総額シェア',
        currentValue: indexConcentration,
        normalizedScore: Math.round(score),
        threshold: HISTORICAL_RANGES.indexConcentration.threshold,
        isWarning: indexConcentration > HISTORICAL_RANGES.indexConcentration.threshold,
        historicalPercentile: calculatePercentile(indexConcentration, HISTORICAL_RANGES.indexConcentration),
        trend: 'rising',
        lastUpdated: now,
      });
    }

    if (leveragedETF !== null) {
      const score = normalizeValue(leveragedETF, HISTORICAL_RANGES.leveragedETF);
      market.push({
        id: 'leveraged-etf',
        category: 'market',
        name: 'レバレッジETF残高',
        description: 'レバレッジETFの運用資産残高（10億ドル）',
        currentValue: leveragedETF,
        normalizedScore: Math.round(score),
        threshold: HISTORICAL_RANGES.leveragedETF.threshold,
        isWarning: leveragedETF > HISTORICAL_RANGES.leveragedETF.threshold,
        historicalPercentile: calculatePercentile(leveragedETF, HISTORICAL_RANGES.leveragedETF),
        trend: 'rising',
        lastUpdated: now,
      });
    }

    // センチメント指標
    const sentiment: RiskIndicator[] = [];

    if (marginDebt !== null) {
      const score = normalizeValue(marginDebt, HISTORICAL_RANGES.marginDebt);
      sentiment.push({
        id: 'margin-debt',
        category: 'sentiment',
        name: '信用取引残高',
        description: '証券口座の信用取引残高（10億ドル）',
        currentValue: marginDebt,
        normalizedScore: Math.round(score),
        threshold: HISTORICAL_RANGES.marginDebt.threshold,
        isWarning: marginDebt > HISTORICAL_RANGES.marginDebt.threshold,
        historicalPercentile: calculatePercentile(marginDebt, HISTORICAL_RANGES.marginDebt),
        trend: 'stable',
        lastUpdated: now,
      });
    }

    return { valuation, financial, macro, market, sentiment };
  } catch (error) {
    console.error('Error generating real indicators:', error);
    return null;
  }
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
    const score = categoryIndicators.length > 0 ? calculateCategoryScore(categoryIndicators) : 0;
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

  if (overallScore >= 80) {
    alerts.push({
      id: `alert-overall-${Date.now()}`,
      timestamp: now,
      severity: 'danger',
      category: 'valuation',
      message: '市場は歴史的な危険水準に達しています。複数の指標が暴落前の水準を示しています。',
      indicators: topWarnings.map((w) => w.id),
    });
  } else if (overallScore >= 60) {
    alerts.push({
      id: `alert-overall-${Date.now()}`,
      timestamp: now,
      severity: 'warning',
      category: 'valuation',
      message: '市場に警戒信号が出ています。リスク管理を強化してください。',
      indicators: topWarnings.map((w) => w.id),
    });
  }

  categoryScores.forEach((cat) => {
    if (cat.score >= 75 && cat.warningCount >= 2) {
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

  return alerts;
}

export async function GET() {
  try {
    console.log('[Risk Monitor] Fetching real-time risk indicators...');

    // 実際のデータを取得
    const indicators = await generateRealIndicators();

    // データ取得に失敗した場合は部分的なデータで継続
    if (!indicators || Object.values(indicators).every(arr => arr.length === 0)) {
      console.warn('[Risk Monitor] Failed to fetch real data, API key may be missing');
      return NextResponse.json({
        success: false,
        error: 'データの取得に失敗しました。FRED_API_KEYを設定してください。',
      }, { status: 503 });
    }

    const categoryScores = calculateCategoryScores(indicators);
    const overallScore = calculateOverallScore(categoryScores);
    const overallLevel = determineRiskLevel(overallScore);
    const topWarnings = getTopWarnings(indicators);

    const currentScores = categoryScores.map((c) => c.score);
    const pattern2000 = [85, 45, 50, 60, 80];
    const similarTo2000 = calculateHistoricalSimilarity(currentScores, pattern2000);
    const pattern2008 = [70, 90, 75, 65, 55];
    const similarTo2008 = calculateHistoricalSimilarity(currentScores, pattern2008);
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

    console.log(`[Risk Monitor] Assessment complete. Overall score: ${overallScore}`);

    // 通知が必要かチェックして送信
    let notificationsSent = false;
    if (shouldNotify(assessment, lastNotificationTime)) {
      console.log('[Risk Monitor] Sending notifications...');
      try {
        const notificationRecords = await sendNotifications(assessment);
        if (notificationRecords.some((record) => record.success)) {
          lastNotificationTime = new Date().toISOString();
          notificationsSent = true;
          console.log(
            `[Risk Monitor] Notifications sent successfully: ${notificationRecords.filter((r) => r.success).length}/${notificationRecords.length}`
          );
        } else {
          console.warn('[Risk Monitor] All notifications failed');
        }
      } catch (notificationError) {
        console.error('[Risk Monitor] Notification error:', notificationError);
      }
    }

    return NextResponse.json({
      success: true,
      data: assessment,
      indicators,
      notificationsSent,
      lastNotificationTime,
    });
  } catch (error) {
    console.error('Risk monitor API error:', error);
    return NextResponse.json(
      { success: false, error: 'リスク評価の取得中にエラーが発生しました' },
      { status: 500 }
    );
  }
}
