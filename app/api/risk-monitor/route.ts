import { NextRequest, NextResponse } from "next/server";
import {
  RiskAssessment,
  RiskIndicator,
  CategoryRiskScore,
  calculateNormalizedScore,
  getRiskLevel,
  getCategoryName,
  calculateCrashSimilarities,
  generateAlerts,
  getIndicatorDescription,
} from "@/app/utils/riskMonitor";
import { getMacroeconomicData } from "@/app/utils/fredAPI";
import { getMarketValuationMetrics, getSP500Price } from "@/app/utils/marketData";
import {
  sendSlackNotification,
  sendDiscordNotification,
  shouldSendNotification,
} from "@/app/utils/notifications";

let lastNotificationTime: Date | undefined = undefined;
let previousAssessment: RiskAssessment | undefined = undefined;

// 前日比を計算するヘルパー関数
function calculateChangePercent(currentValue: number, previousValue: number | undefined): number | undefined {
  if (previousValue === undefined || previousValue === 0) return undefined;
  return ((currentValue - previousValue) / previousValue) * 100;
}

export async function GET(request: NextRequest) {
  try {
    // Fetch data from multiple sources in parallel
    const [macroData, valuationMetrics] = await Promise.all([
      getMacroeconomicData(),
      getMarketValuationMetrics(),
    ]);

    // Build indicators for each category
    const valuationIndicators: RiskIndicator[] = [
      {
        name: "Shiller P/E Ratio",
        category: "valuation",
        value: valuationMetrics.shillerPE,
        normalizedScore: calculateNormalizedScore(
          valuationMetrics.shillerPE,
          15,
          35,
          false // Higher P/E = higher risk
        ),
        direction: valuationMetrics.shillerPE > 25 ? "up" : "down",
        historicalRange: [15, 35],
      },
      {
        name: "Price-to-Sales Ratio",
        category: "valuation",
        value: valuationMetrics.priceToSales,
        normalizedScore: calculateNormalizedScore(
          valuationMetrics.priceToSales,
          1.0,
          3.0,
          false
        ),
        direction: valuationMetrics.priceToSales > 2.0 ? "up" : "down",
        historicalRange: [1.0, 3.0],
      },
      {
        name: "Buffett Indicator",
        category: "valuation",
        value: valuationMetrics.buffettIndicator,
        normalizedScore: calculateNormalizedScore(
          valuationMetrics.buffettIndicator,
          100,
          200,
          false
        ),
        direction: valuationMetrics.buffettIndicator > 150 ? "up" : "down",
        historicalRange: [100, 200],
      },
    ];

    const financialIndicators: RiskIndicator[] = [
      {
        name: "Federal Funds Rate",
        category: "financial",
        value: macroData.federalFundsRate,
        normalizedScore: calculateNormalizedScore(
          macroData.federalFundsRate,
          0,
          8,
          false // Higher rates = higher risk for markets
        ),
        direction: macroData.federalFundsRate > 4 ? "up" : "down",
        historicalRange: [0, 8],
      },
      {
        name: "Credit Spreads",
        category: "financial",
        value: macroData.creditSpreads,
        normalizedScore: calculateNormalizedScore(
          macroData.creditSpreads,
          200,
          800,
          false // Wider spreads = higher risk
        ),
        direction: macroData.creditSpreads > 400 ? "up" : "down",
        historicalRange: [200, 800],
      },
      {
        name: "M2 Money Supply",
        category: "financial",
        value: macroData.m2MoneySupply,
        normalizedScore: calculateNormalizedScore(
          macroData.m2MoneySupply,
          15000000,
          25000000,
          true // Declining M2 = higher risk
        ),
        direction: macroData.m2MoneySupply < 20000000 ? "down" : "up",
        historicalRange: [15000000, 25000000],
      },
    ];

    const macroIndicators: RiskIndicator[] = [
      {
        name: "Unemployment Rate",
        category: "macroeconomic",
        value: macroData.unemploymentRate,
        normalizedScore: calculateNormalizedScore(
          macroData.unemploymentRate,
          3.0,
          10.0,
          false // Higher unemployment = higher risk
        ),
        direction: macroData.unemploymentRate > 5 ? "up" : "down",
        historicalRange: [3.0, 10.0],
      },
      {
        name: "CPI (Inflation)",
        category: "macroeconomic",
        value: macroData.cpi,
        normalizedScore: calculateNormalizedScore(
          macroData.cpi,
          250,
          350,
          false // Higher inflation = higher risk
        ),
        direction: macroData.cpi > 300 ? "up" : "down",
        historicalRange: [250, 350],
      },
      {
        name: "Yield Curve Inversion",
        category: "macroeconomic",
        value: macroData.yieldCurve,
        normalizedScore: calculateNormalizedScore(
          macroData.yieldCurve,
          -1,
          2,
          false // Inverted/flat = higher risk
        ),
        direction: macroData.yieldCurve < 0.5 ? "down" : "up",
        historicalRange: [-1, 2],
      },
    ];

    const marketStructureIndicators: RiskIndicator[] = [
      {
        name: "VIX Index",
        category: "market_structure",
        value: macroData.vixIndex,
        normalizedScore: calculateNormalizedScore(
          macroData.vixIndex,
          10,
          60,
          false // Higher VIX = higher risk
        ),
        direction: macroData.vixIndex > 20 ? "up" : "down",
        historicalRange: [10, 60],
      },
      {
        name: "Index Concentration",
        category: "market_structure",
        value: valuationMetrics.concentration,
        normalizedScore: calculateNormalizedScore(
          valuationMetrics.concentration,
          20,
          50,
          false // Higher concentration = higher risk
        ),
        direction: valuationMetrics.concentration > 30 ? "up" : "down",
        historicalRange: [20, 50],
      },
      {
        name: "Leveraged ETF Balance",
        category: "market_structure",
        value: valuationMetrics.leveragedETFBalance,
        normalizedScore: calculateNormalizedScore(
          valuationMetrics.leveragedETFBalance,
          50000,
          500000,
          false
        ),
        direction: valuationMetrics.leveragedETFBalance > 200000 ? "up" : "down",
        historicalRange: [50000, 500000],
      },
    ];

    const sentimentIndicators: RiskIndicator[] = [
      {
        name: "High Yield Spread",
        category: "sentiment",
        value: macroData.highYieldYield,
        normalizedScore: calculateNormalizedScore(
          macroData.highYieldYield,
          4.0,
          12.0,
          false // Higher yields = higher risk
        ),
        direction: macroData.highYieldYield > 7 ? "up" : "down",
        historicalRange: [4.0, 12.0],
      },
      {
        name: "Earnings Yield Spread",
        category: "sentiment",
        value: valuationMetrics.earningsYieldSpread,
        normalizedScore: calculateNormalizedScore(
          valuationMetrics.earningsYieldSpread,
          0,
          5,
          true // Declining spread = higher risk
        ),
        direction: valuationMetrics.earningsYieldSpread < 2 ? "down" : "up",
        historicalRange: [0, 5],
      },
    ];

    // Calculate category scores
    const categories: CategoryRiskScore[] = [
      {
        category: "valuation",
        name: getCategoryName("valuation"),
        score:
          valuationIndicators.reduce((sum, ind) => sum + ind.normalizedScore, 0) /
          valuationIndicators.length,
        indicators: valuationIndicators,
      },
      {
        category: "financial",
        name: getCategoryName("financial"),
        score:
          financialIndicators.reduce((sum, ind) => sum + ind.normalizedScore, 0) /
          financialIndicators.length,
        indicators: financialIndicators,
      },
      {
        category: "macroeconomic",
        name: getCategoryName("macroeconomic"),
        score:
          macroIndicators.reduce((sum, ind) => sum + ind.normalizedScore, 0) /
          macroIndicators.length,
        indicators: macroIndicators,
      },
      {
        category: "market_structure",
        name: getCategoryName("market_structure"),
        score:
          marketStructureIndicators.reduce((sum, ind) => sum + ind.normalizedScore, 0) /
          marketStructureIndicators.length,
        indicators: marketStructureIndicators,
      },
      {
        category: "sentiment",
        name: getCategoryName("sentiment"),
        score:
          sentimentIndicators.reduce((sum, ind) => sum + ind.normalizedScore, 0) /
          sentimentIndicators.length,
        indicators: sentimentIndicators,
      },
    ];

    // Calculate overall score
    const allIndicators = [
      ...valuationIndicators,
      ...financialIndicators,
      ...macroIndicators,
      ...marketStructureIndicators,
      ...sentimentIndicators,
    ];
    const overallScore =
      allIndicators.reduce((sum, ind) => sum + ind.normalizedScore, 0) / allIndicators.length;

    // Get historical comparisons
    const historicalComparison = calculateCrashSimilarities(allIndicators);

    // Create assessment
    const assessment: RiskAssessment = {
      timestamp: new Date(),
      overallScore,
      riskLevel: getRiskLevel(overallScore),
      categories,
      topWarnings: allIndicators.sort((a, b) => b.normalizedScore - a.normalizedScore).slice(0, 5),
      historicalComparison,
      alerts: [],
    };

    assessment.alerts = generateAlerts(assessment);

    // Handle notifications
    let notificationStatus = {
      slack: false,
      discord: false,
      sent: false,
    };

    if (shouldSendNotification(overallScore, lastNotificationTime)) {
      const [slackResult, discordResult] = await Promise.all([
        sendSlackNotification(assessment),
        sendDiscordNotification(assessment),
      ]);

      notificationStatus = {
        slack: slackResult,
        discord: discordResult,
        sent: slackResult || discordResult,
      };

      if (notificationStatus.sent) {
        lastNotificationTime = new Date();
      }
    }

    // 前日比を計算して追加
    if (previousAssessment) {
      // 前回のインジケーターをマップで管理（検索効率化）
      const previousIndicatorMap = new Map<string, number>();
      previousAssessment.categories.forEach((cat) => {
        cat.indicators.forEach((ind) => {
          previousIndicatorMap.set(ind.name, ind.value);
        });
      });

      // 現在のアセスメントの各indicatorに前日比を追加
      assessment.categories.forEach((cat) => {
        cat.indicators.forEach((ind) => {
          const prevValue = previousIndicatorMap.get(ind.name);
          if (prevValue !== undefined) {
            ind.previousValue = prevValue;
            ind.changePercent = calculateChangePercent(ind.value, prevValue);
          }
        });
      });

      // topWarningsにも前日比を追加
      assessment.topWarnings.forEach((ind) => {
        const prevValue = previousIndicatorMap.get(ind.name);
        if (prevValue !== undefined) {
          ind.previousValue = prevValue;
          ind.changePercent = calculateChangePercent(ind.value, prevValue);
        }
      });
    }

    // 前回のアセスメントを保存
    previousAssessment = assessment;

    return NextResponse.json({
      success: true,
      data: assessment,
      notifications: notificationStatus,
    });
  } catch (error) {
    console.error("Risk monitor error:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to calculate risk assessment",
      },
      { status: 500 }
    );
  }
}
