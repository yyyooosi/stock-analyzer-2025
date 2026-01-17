// FRED API Integration - Fetch macroeconomic data from Federal Reserve

const FRED_BASE_URL = "https://api.stlouisfed.org/fred/series/observations";
const FRED_API_KEY = process.env.FRED_API_KEY;

interface FREDDataPoint {
  date: string;
  value: string;
}

interface FREDResponse {
  observations: FREDDataPoint[];
}

interface FREDFetchResult {
  value: number;
  success: boolean;
}

async function fetchFREDData(seriesId: string): Promise<FREDFetchResult> {
  if (!FRED_API_KEY) {
    console.warn("FRED_API_KEY not configured");
    return { value: 0, success: false };
  }

  try {
    const url = `${FRED_BASE_URL}?series_id=${seriesId}&api_key=${FRED_API_KEY}&file_type=json&sort_order=desc&limit=1`;
    console.log(`[FRED API] Fetching ${seriesId} from URL: ${url.replace(FRED_API_KEY || '', '***')}`);

    const response = await fetch(url);

    if (!response.ok) {
      console.error(`[FRED API] Error for ${seriesId}: ${response.status} ${response.statusText}`);
      const errorText = await response.text();
      console.error(`[FRED API] Response: ${errorText}`);
      return { value: 0, success: false };
    }

    const data: FREDResponse = await response.json();

    if (data.observations && data.observations.length > 0) {
      const latestValue = parseFloat(data.observations[0].value);
      if (!isNaN(latestValue)) {
        console.log(`[FRED API] Success for ${seriesId}: ${latestValue}`);
        return { value: latestValue, success: true };
      }
    }

    console.warn(`[FRED API] No observations for ${seriesId}`);
    return { value: 0, success: false };
  } catch (error) {
    console.error(`[FRED API] Error fetching ${seriesId}:`, error);
    return { value: 0, success: false };
  }
}

export async function getMacroeconomicData() {
  const [
    federalFundsRateResult,
    unemploymentRateResult,
    cpiResult,
    m2MoneySupplyResult,
    yieldCurveResult,
    vixIndexResult,
    creditSpreadsResult,
    highYieldYieldResult,
    marginDebtResult,
  ] = await Promise.all([
    fetchFREDData("FEDFUNDS"), // Federal Funds Rate
    fetchFREDData("UNRATE"), // Unemployment Rate
    fetchFREDData("CPIAUCSL"), // Consumer Price Index
    fetchFREDData("M2SL"), // M2 Money Supply
    fetchFREDData("T10Y2Y"), // 10-Year minus 2-Year yield spread
    fetchFREDData("VIXCLS"), // VIX Index
    fetchFREDData("BAMLH0A0HYM2"), // High Yield OAS (as proxy for credit spreads)
    fetchFREDData("BAMLH0A0HYM2"), // High Yield Bond Yield
    fetchFREDData("BOGZ1FL103064003Q"), // Margin Debt
  ]);

  // デフォルト値
  const defaults = {
    federalFundsRate: 5.0,
    unemploymentRate: 4.0,
    cpi: 300.0,
    m2MoneySupply: 20000000,
    yieldCurve: 0.5,
    vixIndex: 15,
    creditSpreads: 350,
    highYieldYield: 6.5,
    marginDebt: 700000,
  };

  return {
    federalFundsRate: federalFundsRateResult.value || defaults.federalFundsRate,
    federalFundsRateEstimated: !federalFundsRateResult.success,
    unemploymentRate: unemploymentRateResult.value || defaults.unemploymentRate,
    unemploymentRateEstimated: !unemploymentRateResult.success,
    cpi: cpiResult.value || defaults.cpi,
    cpiEstimated: !cpiResult.success,
    m2MoneySupply: m2MoneySupplyResult.value || defaults.m2MoneySupply,
    m2MoneySupplyEstimated: !m2MoneySupplyResult.success,
    yieldCurve: yieldCurveResult.value || defaults.yieldCurve,
    yieldCurveEstimated: !yieldCurveResult.success,
    vixIndex: vixIndexResult.value || defaults.vixIndex,
    vixIndexEstimated: !vixIndexResult.success,
    creditSpreads: creditSpreadsResult.value || defaults.creditSpreads,
    creditSpreadsEstimated: !creditSpreadsResult.success,
    highYieldYield: highYieldYieldResult.value || defaults.highYieldYield,
    highYieldYieldEstimated: !highYieldYieldResult.success,
    marginDebt: marginDebtResult.value || defaults.marginDebt,
    marginDebtEstimated: !marginDebtResult.success,
  };
}

export async function fetchHistoricalFREDData(seriesId: string, startDate: string, endDate: string) {
  if (!FRED_API_KEY) {
    return [];
  }

  try {
    const response = await fetch(
      `${FRED_BASE_URL}?series_id=${seriesId}&api_key=${FRED_API_KEY}&observation_start=${startDate}&observation_end=${endDate}`
    );

    if (!response.ok) {
      return [];
    }

    const data: FREDResponse = await response.json();
    return data.observations || [];
  } catch (error) {
    console.error(`Error fetching historical FRED data for ${seriesId}:`, error);
    return [];
  }
}
