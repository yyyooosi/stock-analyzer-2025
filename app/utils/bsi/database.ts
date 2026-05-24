import { sql } from '@vercel/postgres';

export interface BsiIndicatorRow {
  id: number;
  series_id: string;
  date: string;
  value: number;
  fetched_at: string;
}

export interface BsiSnapshotRow {
  id: number;
  date: string;
  score: number;
  liquidity_score: number;
  concentration_score: number;
  yield_curve: number | null;
  move_index: number | null;
  mag7_share: number | null;
  calculated_at: string;
}

export async function initializeBsiTables(): Promise<void> {
  await sql`
    CREATE TABLE IF NOT EXISTS bsi_indicator_history (
      id         SERIAL PRIMARY KEY,
      series_id  TEXT NOT NULL,
      date       DATE NOT NULL,
      value      NUMERIC(12, 4) NOT NULL,
      fetched_at TIMESTAMP NOT NULL DEFAULT NOW(),
      UNIQUE(series_id, date)
    )
  `;
  await sql`
    CREATE INDEX IF NOT EXISTS idx_bsi_indicator_series_date
      ON bsi_indicator_history(series_id, date DESC)
  `;
  await sql`
    CREATE TABLE IF NOT EXISTS bsi_snapshots (
      id                  SERIAL PRIMARY KEY,
      date                DATE NOT NULL UNIQUE,
      score               NUMERIC(5, 2) NOT NULL,
      liquidity_score     NUMERIC(5, 2),
      concentration_score NUMERIC(5, 2),
      yield_curve         NUMERIC(8, 4),
      move_index          NUMERIC(8, 4),
      mag7_share          NUMERIC(6, 4),
      calculated_at       TIMESTAMP NOT NULL DEFAULT NOW()
    )
  `;
  // 既存テーブルに date カラムがなければ追加するMigration
  await sql`
    ALTER TABLE bsi_snapshots ADD COLUMN IF NOT EXISTS date DATE
  `;
  await sql`
    UPDATE bsi_snapshots SET date = calculated_at::date WHERE date IS NULL
  `;
  // 同日の重複を削除（最新1件のみ保持）してからUNIQUEインデックスを作成
  await sql`
    DELETE FROM bsi_snapshots
    WHERE id NOT IN (
      SELECT DISTINCT ON (date) id
      FROM bsi_snapshots
      ORDER BY date, calculated_at DESC
    )
  `;
  await sql`
    CREATE UNIQUE INDEX IF NOT EXISTS idx_bsi_snapshots_date
      ON bsi_snapshots(date)
  `;
  await sql`
    CREATE INDEX IF NOT EXISTS idx_bsi_snapshots_calculated_at
      ON bsi_snapshots(calculated_at DESC)
  `;
}

export async function upsertIndicator(
  seriesId: string,
  date: string,
  value: number
): Promise<void> {
  await sql`
    INSERT INTO bsi_indicator_history (series_id, date, value)
    VALUES (${seriesId}, ${date}, ${value})
    ON CONFLICT (series_id, date) DO UPDATE SET value = EXCLUDED.value, fetched_at = NOW()
  `;
}

export async function bulkUpsertIndicators(
  seriesId: string,
  records: { date: string; value: number }[]
): Promise<void> {
  for (const rec of records) {
    await upsertIndicator(seriesId, rec.date, rec.value);
  }
}

export async function getIndicatorHistory(
  seriesId: string,
  days: number = 3650
): Promise<number[]> {
  const result = await sql`
    SELECT value
    FROM bsi_indicator_history
    WHERE series_id = ${seriesId}
      AND date >= NOW() - (${days} || ' days')::INTERVAL
    ORDER BY date ASC
  `;
  return result.rows.map((r) => Number(r.value));
}

export async function countIndicatorHistory(seriesId: string): Promise<number> {
  const result = await sql`
    SELECT COUNT(*) as cnt FROM bsi_indicator_history WHERE series_id = ${seriesId}
  `;
  return Number(result.rows[0].cnt);
}

export async function saveBsiSnapshot(data: {
  score: number;
  liquidityScore: number;
  concentrationScore: number;
  yieldCurve: number | null;
  moveIndex: number | null;
  mag7Share: number | null;
}): Promise<void> {
  const today = new Date().toISOString().split('T')[0];
  await sql`
    INSERT INTO bsi_snapshots
      (date, score, liquidity_score, concentration_score, yield_curve, move_index, mag7_share)
    VALUES
      (${today}, ${data.score}, ${data.liquidityScore}, ${data.concentrationScore},
       ${data.yieldCurve}, ${data.moveIndex}, ${data.mag7Share})
    ON CONFLICT (date) DO UPDATE SET
      score               = EXCLUDED.score,
      liquidity_score     = EXCLUDED.liquidity_score,
      concentration_score = EXCLUDED.concentration_score,
      yield_curve         = EXCLUDED.yield_curve,
      move_index          = EXCLUDED.move_index,
      mag7_share          = EXCLUDED.mag7_share,
      calculated_at       = NOW()
  `;
}

export async function getLatestBsiSnapshot(): Promise<BsiSnapshotRow | null> {
  const result = await sql`
    SELECT id, date, score, liquidity_score, concentration_score,
           yield_curve, move_index, mag7_share, calculated_at
    FROM bsi_snapshots
    ORDER BY date DESC
    LIMIT 1
  `;
  if (result.rowCount === 0) return null;
  return result.rows[0] as BsiSnapshotRow;
}

export async function getBsiHistory(days: number = 90): Promise<BsiSnapshotRow[]> {
  const result = await sql`
    SELECT DISTINCT ON (date)
      id, date, score, liquidity_score, concentration_score,
      yield_curve, move_index, mag7_share, calculated_at
    FROM bsi_snapshots
    WHERE date >= CURRENT_DATE - ${days}
    ORDER BY date ASC, calculated_at DESC
  `;
  return result.rows as BsiSnapshotRow[];
}
