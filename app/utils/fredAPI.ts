// FRED API Integration - Fetch macroeconomic data from Federal Reserve

const FRED_BASE_URL = "https://api.stlouisfed.org/fred/series/data";
const FRED_API_KEY = process.env.FRED_API_KEY;

// Development mode: use mock data to test without network dependency
const USE_MOCK_DATA = process.env.FRED_MOCK_DATA === "true";

const mockFREDData: Record<string, number> = {
  FEDFUNDS: 5.33,     // Federal Funds Rate
  UNRATE: 4.2,        // Unemployment Rate
  CPIAUCSL: 318.5,    // CPI
  M2SL: 21500000,     // M2 Money Supply
  T10Y2Y: 0.45,       // Yield Curve
  VIXCLS: 15.88,      // VIX Index
  "BAMLH0A0HYM2": 350, // High Yield OAS
  "BOGZ1FL103064003Q": 720000, // Margin Debt
};

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
  // Use mock data for development/testing
  if (USE_MOCK_DATA) {
    const mockValue = mockFREDData[seriesId];
    if (mockValue !== undefined) {
      console.log(`[FRED API] Mock data for ${seriesId}: ${mockValue}`);
      return { value: mockValue, success: true };
    }
    console.warn(`[FRED API] Mock data not found for ${seriesId}`);
    return { value: 0, success: false };
  }

  if (!FRED_API_KEY) {
    console.warn("FRED_API_KEY not configured");
    return { value: 0, success: false };
  }

  try {
    const url = `${FRED_BASE_URL}?series_id=${seriesId}&api_key=${FRED_API_KEY}&limit=1&sort_order=desc`;
    console.log(`[FRED API] Fetching ${seriesId} from FRED...`);

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
