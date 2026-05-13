import { fetchLatestYieldCurve, fetchYieldCurveHistory } from '../sources/fred';
import { calcMag7Share } from '../sources/mag7';
import {
  calcZScore,
  zScoreToScore,
  MIN_HISTORY_FOR_ZSCORE,
} from './zscore';
import {
  initializeBsiTables,
  upsertIndicator,
  bulkUpsertIndicators,
  getIndicatorHistory,
  countIndicatorHistory,
  saveBsiSnapshot,
} from '../database';

export interface BsiResult {
  score: number;
  liquidityScore: number;
  concentrationScore: number;
  rawValues: {
    yieldCurve: number | null;
    mag7Share: number | null;
  };
  dataQuality: {
    yieldCurveHistoryCount: number;
    mag7HistoryCount: number;
    hasEnoughHistory: boolean;
  };
  calculatedAt: string;
}

// 過去10年分のブートストラップ (初回のみ実行)
async function bootstrapIfNeeded(): Promise<void> {
  const yieldCount = await countIndicatorHistory('T10Y2Y');
  if (yieldCount >= MIN_HISTORY_FOR_ZSCORE) return;

  console.log('[BSI] 初回ブートストラップ: 過去10年分の FRED データを取得します');
  const tenYearsAgo = new Date();
  tenYearsAgo.setFullYear(tenYearsAgo.getFullYear() - 10);
  const startDate = tenYearsAgo.toISOString().split('T')[0];
  const endDate = new Date().toISOString().split('T')[0];

  const yieldHistory = await fetchYieldCurveHistory(startDate, endDate);
  if (yieldHistory.length > 0) {
    await bulkUpsertIndicators('T10Y2Y', yieldHistory);
    console.log(`[BSI] T10Y2Y: ${yieldHistory.length} 件を DB に保存しました`);
  }
}

export async function calculateBsi(): Promise<BsiResult> {
  await initializeBsiTables();
  await bootstrapIfNeeded();

  const today = new Date().toISOString().split('T')[0];

  // 各指標を並行取得
  const [latestYieldCurve, mag7Result] = await Promise.all([
    fetchLatestYieldCurve(),
    calcMag7Share(),
  ]);

  // DB に最新値を保存
  if (latestYieldCurve !== null) {
    await upsertIndicator('T10Y2Y', today, latestYieldCurve);
  }
  if (mag7Result !== null) {
    await upsertIndicator('MAG7_SHARE', today, mag7Result.share);
  }

  // 履歴を取得
  const [yieldHistory, mag7History] = await Promise.all([
    getIndicatorHistory('T10Y2Y', 3650),
    getIndicatorHistory('MAG7_SHARE', 3650),
  ]);

  const yieldCount = yieldHistory.length;
  const mag7Count = mag7History.length;
  const hasEnoughHistory =
    yieldCount >= MIN_HISTORY_FOR_ZSCORE && mag7Count >= MIN_HISTORY_FOR_ZSCORE;

  // --- 流動性スコア (T10Y2Y のみ Phase 0) ---
  // イールドカーブは「逆イールド(負値) = 流動性ストレス高」なので符号を反転して使う
  let liquidityScore = 50;
  if (latestYieldCurve !== null && yieldCount >= MIN_HISTORY_FOR_ZSCORE) {
    const ycZ = calcZScore(latestYieldCurve, yieldHistory.slice(0, -1));
    liquidityScore = zScoreToScore(-ycZ); // 符号反転
  } else if (latestYieldCurve !== null) {
    // データ不足時: 生値をおおまかにスコア化 (逆イールド=-1→80点, 正常=+1→20点)
    liquidityScore = Math.min(100, Math.max(0, 50 - latestYieldCurve * 30));
  }

  // --- 集中度スコア (MAG7_SHARE) ---
  let concentrationScore = 50;
  if (mag7Result !== null && mag7Count >= MIN_HISTORY_FOR_ZSCORE) {
    const mag7Z = calcZScore(mag7Result.share, mag7History.slice(0, -1));
    concentrationScore = zScoreToScore(mag7Z);
  } else if (mag7Result !== null) {
    // データ不足時: シェア 30% → 50点、40% → 100点 の線形近似
    concentrationScore = Math.min(100, Math.max(0, (mag7Result.share - 0.2) * 500));
  }

  // --- BSI スコア (流動性 60%, 集中度 40%) ---
  const score = Math.round((liquidityScore * 0.6 + concentrationScore * 0.4) * 10) / 10;

  await saveBsiSnapshot({
    score,
    liquidityScore: Math.round(liquidityScore * 10) / 10,
    concentrationScore: Math.round(concentrationScore * 10) / 10,
    yieldCurve: latestYieldCurve,
    moveIndex: null, // Phase 1 以降
    mag7Share: mag7Result?.share ?? null,
  });

  console.log(
    `[BSI] 計算完了: BSI=${score}, 流動性=${liquidityScore.toFixed(1)}, 集中度=${concentrationScore.toFixed(1)}`
  );

  return {
    score,
    liquidityScore: Math.round(liquidityScore * 10) / 10,
    concentrationScore: Math.round(concentrationScore * 10) / 10,
    rawValues: {
      yieldCurve: latestYieldCurve,
      mag7Share: mag7Result?.share ?? null,
    },
    dataQuality: {
      yieldCurveHistoryCount: yieldCount,
      mag7HistoryCount: mag7Count,
      hasEnoughHistory,
    },
    calculatedAt: new Date().toISOString(),
  };
}

// BSI スコアからリスクレベルを判定
export function getBsiLevel(score: number): {
  level: 'low' | 'moderate' | 'elevated' | 'high' | 'critical';
  label: string;
  color: string;
} {
  if (score < 25) return { level: 'low', label: '低リスク', color: 'green' };
  if (score < 45) return { level: 'moderate', label: '中程度', color: 'yellow' };
  if (score < 65) return { level: 'elevated', label: '要注意', color: 'orange' };
  if (score < 80) return { level: 'high', label: '高リスク', color: 'red' };
  return { level: 'critical', label: '危険水域', color: 'red' };
}
