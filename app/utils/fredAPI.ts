/**
 * FRED (Federal Reserve Economic Data) API統合
 * マクロ経済指標の取得
 */

const FRED_API_BASE = 'https://api.stlouisfed.org/fred';

interface FREDSeriesObservation {
  realtime_start: string;
  realtime_end: string;
  date: string;
  value: string;
}

interface FREDResponse {
  realtime_start: string;
  realtime_end: string;
  observation_start: string;
  observation_end: string;
  units: string;
  output_type: number;
  file_type: string;
  order_by: string;
  sort_order: string;
  count: number;
  offset: number;
  limit: number;
  observations: FREDSeriesObservation[];
}

/**
 * FREDから最新のデータポイントを取得
 */
async function fetchLatestFREDData(
  seriesId: string,
  apiKey?: string
): Promise<number | null> {
  if (!apiKey) {
    console.warn(`FRED API key not provided for ${seriesId}`);
    return null;
  }

  try {
    const url = `${FRED_API_BASE}/series/observations?series_id=${seriesId}&api_key=${apiKey}&file_type=json&sort_order=desc&limit=1`;

    const response = await fetch(url, {
      cache: 'no-store',
    });

    if (!response.ok) {
      console.warn(`FRED API error for ${seriesId}: ${response.status}`);
      return null;
    }

    const data: FREDResponse = await response.json();

    if (data.observations && data.observations.length > 0) {
      const latestValue = data.observations[0].value;
      if (latestValue === '.' || latestValue === '') {
        return null;
      }
      return parseFloat(latestValue);
    }

    return null;
  } catch (error) {
    console.error(`Error fetching FRED data for ${seriesId}:`, error);
    return null;
  }
}

/**
 * 複数の観測値を取得（トレンド分析用）
 */
async function fetchFREDSeries(
  seriesId: string,
  apiKey: string,
  limit: number = 12
): Promise<FREDSeriesObservation[]> {
  try {
    const url = `${FRED_API_BASE}/series/observations?series_id=${seriesId}&api_key=${apiKey}&file_type=json&sort_order=desc&limit=${limit}`;

    const response = await fetch(url, {
      cache: 'no-store',
    });

    if (!response.ok) {
      console.warn(`FRED API error for ${seriesId}: ${response.status}`);
      return [];
    }

    const data: FREDResponse = await response.json();
    return data.observations || [];
  } catch (error) {
    console.error(`Error fetching FRED series for ${seriesId}:`, error);
    return [];
  }
}

/**
 * 主要なマクロ経済指標を一括取得
 */
export async function fetchMacroEconomicData(apiKey?: string) {
  if (!apiKey) {
    console.warn('FRED API key not provided, using fallback data');
    return null;
  }

  try {
    const [
      fedFundsRate,
      unemploymentRate,
      cpi,
      m2,
      yield10Y,
      yield2Y,
      vix,
    ] = await Promise.all([
      fetchLatestFREDData('FEDFUNDS', apiKey),     // FF金利
      fetchLatestFREDData('UNRATE', apiKey),       // 失業率
      fetchLatestFREDData('CPIAUCSL', apiKey),     // CPI（レベル）
      fetchLatestFREDData('M2SL', apiKey),         // M2マネーサプライ
      fetchLatestFREDData('DGS10', apiKey),        // 10年債利回り
      fetchLatestFREDData('DGS2', apiKey),         // 2年債利回り
      fetchLatestFREDData('VIXCLS', apiKey),       // VIX
    ]);

    // トレンド分析のため過去データも取得
    const [
      cpiSeries,
      m2Series,
    ] = await Promise.all([
      fetchFREDSeries('CPIAUCSL', apiKey, 13), // 13ヶ月分（前年同月比計算用）
      fetchFREDSeries('M2SL', apiKey, 13),
    ]);

    // CPI前年同月比を計算
    let cpiYoY = null;
    if (cpiSeries.length >= 13) {
      const latest = parseFloat(cpiSeries[0].value);
      const yearAgo = parseFloat(cpiSeries[12].value);
      if (!isNaN(latest) && !isNaN(yearAgo)) {
        cpiYoY = ((latest - yearAgo) / yearAgo) * 100;
      }
    }

    // M2増加率を計算
    let m2Growth = null;
    if (m2Series.length >= 13) {
      const latest = parseFloat(m2Series[0].value);
      const yearAgo = parseFloat(m2Series[12].value);
      if (!isNaN(latest) && !isNaN(yearAgo)) {
        m2Growth = ((latest - yearAgo) / yearAgo) * 100;
      }
    }

    // イールドカーブ（10年-2年）
    let yieldCurve = null;
    if (yield10Y !== null && yield2Y !== null) {
      yieldCurve = yield10Y - yield2Y;
    }

    return {
      fedFundsRate,
      unemploymentRate,
      cpi: cpiYoY,        // 前年同月比
      m2Growth,           // 前年同月比
      yield10Y,
      yield2Y,
      yieldCurve,
      vix,
    };
  } catch (error) {
    console.error('Error fetching macro economic data:', error);
    return null;
  }
}

/**
 * ISM製造業指数を取得（Investing.comなどから取得する必要があるため、代替値を使用）
 */
export async function fetchISMManufacturing(): Promise<number | null> {
  // ISM製造業指数はFREDでは直接取得できないため、
  // 代わりに工業生産指数などの代替指標を使用するか、
  // 外部ソースから取得する必要があります
  // ここでは簡易的にPMIの概算値を返します
  return null; // 実装時は外部APIと統合
}

/**
 * クレジットスプレッドを取得
 */
export async function fetchCreditSpread(apiKey?: string): Promise<number | null> {
  if (!apiKey) return null;

  try {
    // BAAとAAAの差（クレジットスプレッドの代理指標）
    const [baaYield, aaaYield] = await Promise.all([
      fetchLatestFREDData('DBAA', apiKey),  // Moody's Seasoned Baa Corporate Bond Yield
      fetchLatestFREDData('DAAA', apiKey),  // Moody's Seasoned Aaa Corporate Bond Yield
    ]);

    if (baaYield !== null && aaaYield !== null) {
      return baaYield - aaaYield;
    }

    return null;
  } catch (error) {
    console.error('Error fetching credit spread:', error);
    return null;
  }
}

/**
 * ハイイールド債利回りを取得
 */
export async function fetchHYYield(apiKey?: string): Promise<number | null> {
  if (!apiKey) return null;

  try {
    // ICE BofA US High Yield Index Effective Yield
    return await fetchLatestFREDData('BAMLH0A0HYM2', apiKey);
  } catch (error) {
    console.error('Error fetching HY yield:', error);
    return null;
  }
}
