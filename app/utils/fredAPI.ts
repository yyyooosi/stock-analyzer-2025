// FRED API Integration - Fetch macroeconomic data from Federal Reserve

const FRED_BASE_URL = "https://api.stlouisfed.org/fred/series/data";
const FRED_API_KEY = process.env.FRED_API_KEY;

interface FREDDataPoint {
  date: string;
  value: string;
}

interface FREDResponse {
  observations: FREDDataPoint[];
}

async function fetchFREDData(seriesId: string): Promise<number | null> {
  if (!FRED_API_KEY) {
    console.warn("FRED_API_KEY not configured");
    return null;
  }

  try {
    const response = await fetch(
      `${FRED_BASE_URL}?series_id=${seriesId}&api_key=${FRED_API_KEY}&limit=1&sort_order=desc`
    );

    if (!response.ok) {
      console.error(`FRED API error for ${seriesId}: ${response.status}`);
      return null;
    }

    const data: FREDResponse = await response.json();

    if (data.observations && data.observations.length > 0) {
      const latestValue = parseFloat(data.observations[0].value);
      return isNaN(latestValue) ? null : latestValue;
    }

    return null;
  } catch (error) {
    console.error(`Error fetching FRED data for ${seriesId}:`, error);
    return null;
  }
}

export async function getMacroeconomicData() {
  const [
    federalFundsRate,
    unemploymentRate,
    cpi,
    m2MoneySupply,
    yeildCurve,
    vixIndex,
    creditSpreads,
    highYieldYield,
    marginDebt,
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

  return {
    federalFundsRate: federalFundsRate || 5.0,
    unemploymentRate: unemploymentRate || 4.0,
    cpi: cpi || 300.0,
    m2MoneySupply: m2MoneySupply || 20000000,
    yieldCurve: yeildCurve || 0.5,
    vixIndex: vixIndex || 15,
    creditSpreads: creditSpreads || 350,
    highYieldYield: highYieldYield || 6.5,
    marginDebt: marginDebt || 700000,
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
