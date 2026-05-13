// 既存の fredAPI.ts を BSI 用にラップ・拡張するモジュール

const FRED_BASE_URL = 'https://api.stlouisfed.org/fred/series/observations';

interface FredObservation {
  date: string;
  value: string;
}

async function fetchFredSeries(
  seriesId: string,
  startDate: string,
  endDate: string
): Promise<FredObservation[]> {
  const apiKey = process.env.FRED_API_KEY;
  if (!apiKey) {
    console.warn('[BSI/FRED] FRED_API_KEY が設定されていません');
    return [];
  }

  try {
    const url =
      `${FRED_BASE_URL}?series_id=${seriesId}&api_key=${apiKey}` +
      `&file_type=json&observation_start=${startDate}&observation_end=${endDate}` +
      `&sort_order=asc`;
    const res = await fetch(url);
    if (!res.ok) {
      console.error(`[BSI/FRED] ${seriesId} 取得エラー: ${res.status}`);
      return [];
    }
    const data = await res.json();
    return (data.observations ?? []) as FredObservation[];
  } catch (err) {
    console.error(`[BSI/FRED] ${seriesId} フェッチ例外:`, err);
    return [];
  }
}

// 欠損値 ('.' など) を除外して数値配列に変換
function toNumericRecords(
  observations: FredObservation[]
): { date: string; value: number }[] {
  return observations
    .filter((o) => o.value !== '.' && !isNaN(parseFloat(o.value)))
    .map((o) => ({ date: o.date, value: parseFloat(o.value) }));
}

// 10年分の T10Y2Y (イールドカーブ) を取得
export async function fetchYieldCurveHistory(
  startDate: string,
  endDate: string
): Promise<{ date: string; value: number }[]> {
  const obs = await fetchFredSeries('T10Y2Y', startDate, endDate);
  return toNumericRecords(obs);
}

// 直近の T10Y2Y を1件取得
export async function fetchLatestYieldCurve(): Promise<number | null> {
  const apiKey = process.env.FRED_API_KEY;
  if (!apiKey) return null;
  try {
    const url =
      `${FRED_BASE_URL}?series_id=T10Y2Y&api_key=${apiKey}` +
      `&file_type=json&sort_order=desc&limit=5`;
    const res = await fetch(url);
    if (!res.ok) return null;
    const data = await res.json();
    const obs: FredObservation[] = data.observations ?? [];
    const valid = obs.find((o) => o.value !== '.' && !isNaN(parseFloat(o.value)));
    return valid ? parseFloat(valid.value) : null;
  } catch {
    return null;
  }
}
