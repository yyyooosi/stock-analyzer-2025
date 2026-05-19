// z-score 正規化ユーティリティ

export function calcMean(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((s, v) => s + v, 0) / values.length;
}

export function calcStdDev(values: number[], mean: number): number {
  if (values.length < 2) return 1;
  const variance = values.reduce((s, v) => s + (v - mean) ** 2, 0) / values.length;
  return Math.sqrt(variance) || 1; // ゼロ除算防止
}

// z-score を計算する (母集団に最新値を含む)
export function calcZScore(latest: number, history: number[]): number {
  const all = [...history, latest];
  const mean = calcMean(all);
  const std = calcStdDev(all, mean);
  return (latest - mean) / std;
}

// z-score を 0-100 スコアにマッピング (-2σ→0, 0σ→50, +2σ→100)
export function zScoreToScore(z: number): number {
  return Math.min(100, Math.max(0, ((z + 2) / 4) * 100));
}

// 履歴データが不足している場合の判定 (30件未満はニュートラル扱い)
export const MIN_HISTORY_FOR_ZSCORE = 30;
