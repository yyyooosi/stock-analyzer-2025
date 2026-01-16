// Risk Monitor Scheduler - Execute risk assessment at scheduled times

import cron from "node-cron";
import {
  RiskAssessment,
  calculateNormalizedScore,
  getRiskLevel,
  getCategoryName,
  calculateCrashSimilarities,
  generateAlerts,
} from "./riskMonitor";
import { getMacroeconomicData } from "./fredAPI";
import { getMarketValuationMetrics } from "./marketData";
import {
  sendSlackNotification,
  sendDiscordNotification,
} from "./notifications";

let schedulerRunning = false;

export function startRiskMonitorScheduler() {
  if (schedulerRunning) {
    console.log("Risk monitor scheduler already running");
    return;
  }

  // スケジュール: 毎朝9時（日本時間）
  // Cron表記: 秒 分 時 日 月 曜日
  // 0 0 9 * * * = 毎日09:00:00 UTC
  // 日本時間の9時は UTC-9 なので、UTC時刻の00:00に日本時間の09:00
  // 実環境では環境変数でタイムゾーンを設定可能にします

  const cronExpression = process.env.CRON_SCHEDULE || "0 0 0 * * *"; // デフォルト: 毎日00:00 UTC (日本時間 09:00)

  console.log(`🕐 Risk Monitor Scheduler started with cron: ${cronExpression}`);

  const task = cron.schedule(cronExpression, async () => {
    await executeRiskAssessment("Scheduled");
  });

  schedulerRunning = true;

  // Graceful shutdown
  process.on("SIGTERM", () => {
    console.log("Stopping Risk Monitor Scheduler...");
    task.stop();
    schedulerRunning = false;
  });

  return task;
}

async function executeRiskAssessment(triggerSource: "Scheduled" | "Manual" | "API") {
  const startTime = Date.now();

  try {
    console.log(`\n${"=".repeat(60)}`);
    console.log(
      `📊 Risk Assessment Execution - Trigger: ${triggerSource} - ${new Date().toLocaleString("ja-JP", { timeZone: "Asia/Tokyo" })}`
    );
    console.log(`${"=".repeat(60)}\n`);

    // Fetch data in parallel
    const [macroData, valuationMetrics] = await Promise.all([
      getMacroeconomicData(),
      getMarketValuationMetrics(),
    ]);

    console.log("✓ Data fetched successfully");

    // Calculate risk assessment (same logic as API)
    const valuationIndicators = [
      {
        name: "Shiller P/E Ratio",
        category: "valuation" as const,
        value: valuationMetrics.shillerPE,
        normalizedScore: calculateNormalizedScore(
          valuationMetrics.shillerPE,
          15,
          35,
          false
        ),
        direction: valuationMetrics.shillerPE > 25 ? ("up" as const) : ("down" as const),
        historicalRange: [15, 35] as [number, number],
      },
      {
        name: "Price-to-Sales Ratio",
        category: "valuation" as const,
        value: valuationMetrics.priceToSales,
        normalizedScore: calculateNormalizedScore(
          valuationMetrics.priceToSales,
          1.0,
          3.0,
          false
        ),
        direction: valuationMetrics.priceToSales > 2.0 ? ("up" as const) : ("down" as const),
        historicalRange: [1.0, 3.0] as [number, number],
      },
      {
        name: "Buffett Indicator",
        category: "valuation" as const,
        value: valuationMetrics.buffettIndicator,
        normalizedScore: calculateNormalizedScore(
          valuationMetrics.buffettIndicator,
          100,
          200,
          false
        ),
        direction: valuationMetrics.buffettIndicator > 150 ? ("up" as const) : ("down" as const),
        historicalRange: [100, 200] as [number, number],
      },
    ];

    const financialIndicators = [
      {
        name: "Federal Funds Rate",
        category: "financial" as const,
        value: macroData.federalFundsRate,
        normalizedScore: calculateNormalizedScore(
          macroData.federalFundsRate,
          0,
          8,
          false
        ),
        direction: macroData.federalFundsRate > 4 ? ("up" as const) : ("down" as const),
        historicalRange: [0, 8] as [number, number],
      },
      {
        name: "Credit Spreads",
        category: "financial" as const,
        value: macroData.creditSpreads,
        normalizedScore: calculateNormalizedScore(
          macroData.creditSpreads,
          200,
          800,
          false
        ),
        direction: macroData.creditSpreads > 400 ? ("up" as const) : ("down" as const),
        historicalRange: [200, 800] as [number, number],
      },
      {
        name: "M2 Money Supply",
        category: "financial" as const,
        value: macroData.m2MoneySupply,
        normalizedScore: calculateNormalizedScore(
          macroData.m2MoneySupply,
          15000000,
          25000000,
          true
        ),
        direction: macroData.m2MoneySupply < 20000000 ? ("down" as const) : ("up" as const),
        historicalRange: [15000000, 25000000] as [number, number],
      },
    ];

    const macroIndicators = [
      {
        name: "Unemployment Rate",
        category: "macroeconomic" as const,
        value: macroData.unemploymentRate,
        normalizedScore: calculateNormalizedScore(
          macroData.unemploymentRate,
          3.0,
          10.0,
          false
        ),
        direction: macroData.unemploymentRate > 5 ? ("up" as const) : ("down" as const),
        historicalRange: [3.0, 10.0] as [number, number],
      },
      {
        name: "CPI (Inflation)",
        category: "macroeconomic" as const,
        value: macroData.cpi,
        normalizedScore: calculateNormalizedScore(
          macroData.cpi,
          250,
          350,
          false
        ),
        direction: macroData.cpi > 300 ? ("up" as const) : ("down" as const),
        historicalRange: [250, 350] as [number, number],
      },
      {
        name: "Yield Curve Inversion",
        category: "macroeconomic" as const,
        value: macroData.yieldCurve,
        normalizedScore: calculateNormalizedScore(
          macroData.yieldCurve,
          -1,
          2,
          false
        ),
        direction: macroData.yieldCurve < 0.5 ? ("down" as const) : ("up" as const),
        historicalRange: [-1, 2] as [number, number],
      },
    ];

    const marketStructureIndicators = [
      {
        name: "VIX Index",
        category: "market_structure" as const,
        value: macroData.vixIndex,
        normalizedScore: calculateNormalizedScore(
          macroData.vixIndex,
          10,
          60,
          false
        ),
        direction: macroData.vixIndex > 20 ? ("up" as const) : ("down" as const),
        historicalRange: [10, 60] as [number, number],
      },
      {
        name: "Index Concentration",
        category: "market_structure" as const,
        value: valuationMetrics.concentration,
        normalizedScore: calculateNormalizedScore(
          valuationMetrics.concentration,
          20,
          50,
          false
        ),
        direction: valuationMetrics.concentration > 30 ? ("up" as const) : ("down" as const),
        historicalRange: [20, 50] as [number, number],
      },
      {
        name: "Leveraged ETF Balance",
        category: "market_structure" as const,
        value: valuationMetrics.leveragedETFBalance,
        normalizedScore: calculateNormalizedScore(
          valuationMetrics.leveragedETFBalance,
          50000,
          500000,
          false
        ),
        direction: valuationMetrics.leveragedETFBalance > 200000 ? ("up" as const) : ("down" as const),
        historicalRange: [50000, 500000] as [number, number],
      },
    ];

    const sentimentIndicators = [
      {
        name: "High Yield Spread",
        category: "sentiment" as const,
        value: macroData.highYieldYield,
        normalizedScore: calculateNormalizedScore(
          macroData.highYieldYield,
          4.0,
          12.0,
          false
        ),
        direction: macroData.highYieldYield > 7 ? ("up" as const) : ("down" as const),
        historicalRange: [4.0, 12.0] as [number, number],
      },
      {
        name: "Earnings Yield Spread",
        category: "sentiment" as const,
        value: valuationMetrics.earningsYieldSpread,
        normalizedScore: calculateNormalizedScore(
          valuationMetrics.earningsYieldSpread,
          0,
          5,
          true
        ),
        direction: valuationMetrics.earningsYieldSpread < 2 ? ("down" as const) : ("up" as const),
        historicalRange: [0, 5] as [number, number],
      },
    ];

    const categories = [
      {
        category: "valuation" as const,
        name: getCategoryName("valuation"),
        score:
          valuationIndicators.reduce((sum, ind) => sum + ind.normalizedScore, 0) /
          valuationIndicators.length,
        indicators: valuationIndicators,
      },
      {
        category: "financial" as const,
        name: getCategoryName("financial"),
        score:
          financialIndicators.reduce((sum, ind) => sum + ind.normalizedScore, 0) /
          financialIndicators.length,
        indicators: financialIndicators,
      },
      {
        category: "macroeconomic" as const,
        name: getCategoryName("macroeconomic"),
        score:
          macroIndicators.reduce((sum, ind) => sum + ind.normalizedScore, 0) /
          macroIndicators.length,
        indicators: macroIndicators,
      },
      {
        category: "market_structure" as const,
        name: getCategoryName("market_structure"),
        score:
          marketStructureIndicators.reduce((sum, ind) => sum + ind.normalizedScore, 0) /
          marketStructureIndicators.length,
        indicators: marketStructureIndicators,
      },
      {
        category: "sentiment" as const,
        name: getCategoryName("sentiment"),
        score:
          sentimentIndicators.reduce((sum, ind) => sum + ind.normalizedScore, 0) /
          sentimentIndicators.length,
        indicators: sentimentIndicators,
      },
    ];

    const allIndicators = [
      ...valuationIndicators,
      ...financialIndicators,
      ...macroIndicators,
      ...marketStructureIndicators,
      ...sentimentIndicators,
    ];

    const overallScore =
      allIndicators.reduce((sum, ind) => sum + ind.normalizedScore, 0) / allIndicators.length;

    const historicalComparison = calculateCrashSimilarities(allIndicators);

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

    console.log(
      `\n✓ Risk Assessment Calculated:\n  Overall Score: ${overallScore.toFixed(1)}/100\n  Risk Level: ${assessment.riskLevel.toUpperCase()}`
    );

    // Send notifications
    console.log("\n📤 Sending notifications...");
    const [slackResult, discordResult] = await Promise.all([
      sendSlackNotification(assessment),
      sendDiscordNotification(assessment),
    ]);

    console.log(`  ✓ Slack: ${slackResult ? "Success" : "Failed"}`);
    console.log(`  ✓ Discord: ${discordResult ? "Success" : "Failed"}`);

    const executionTime = Date.now() - startTime;
    console.log(`\n✅ Execution completed in ${executionTime}ms`);
    console.log(`${"=".repeat(60)}\n`);

    return assessment;
  } catch (error) {
    const executionTime = Date.now() - startTime;
    console.error(`❌ Error executing risk assessment (${executionTime}ms):`, error);
    console.log(`${"=".repeat(60)}\n`);
    throw error;
  }
}

export { executeRiskAssessment };
