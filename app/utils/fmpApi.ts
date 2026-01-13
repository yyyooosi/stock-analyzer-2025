/**
 * Financial Modeling Prep (FMP) API Utility
 *
 * This module provides functions to fetch stock data from the FMP API:
 * - Stock list and quotes (using available-traded/list endpoint)
 * - Company fundamentals (P/E, P/B, ROE, etc.)
 * - Financial ratios and key metrics
 *
 * API Documentation: https://site.financialmodelingprep.com/developer/docs
 *
 * NOTE: Stock Screener API (/api/v3/stock-screener) is deprecated as of August 31, 2025.
 * We now use /api/v3/available-traded/list as the primary data source.
 */

const FMP_BASE_URL = 'https://financialmodelingprep.com/api/v3';

export interface FMPScreenerParams {
  // Market cap filters (in USD)
  marketCapMoreThan?: number;
  marketCapLowerThan?: number;

  // Price filters
  priceMoreThan?: number;
  priceLowerThan?: number;

  // Volume filters
  volumeMoreThan?: number;
  volumeLowerThan?: number;

  // Beta filters
  betaMoreThan?: number;
  betaLowerThan?: number;

  // Dividend filters
  dividendMoreThan?: number;
  dividendLowerThan?: number;

  // Sector filter
  sector?: string;

  // Exchange filter (nyse, nasdaq, amex, etc.)
  exchange?: string;

  // ETF filter
  isEtf?: boolean;

  // Trading status filter
  isActivelyTrading?: boolean;

  // Result limit
  limit?: number;
}

export interface FMPStockScreenerResult {
  symbol: string;
  companyName: string;
  marketCap: number;
  sector: string;
  industry: string;
  beta: number;
  price: number;
  lastAnnualDividend: number;
  volume: number;
  exchange: string;
  exchangeShortName: string;
  country: string;
  isEtf: boolean;
  isActivelyTrading: boolean;
}

/**
 * Response from /api/v3/available-traded/list endpoint
 * This is the NEW recommended endpoint (Stock Screener API is deprecated)
 */
export interface FMPTradableStock {
  symbol: string;
  name: string;
  price: number;
  exchange: string;
  exchangeShortName?: string;
  type?: string; // "stock", "etf", "trust", etc.
}

export interface FMPKeyMetrics {
  symbol: string;
  date: string;
  period: string;
  revenuePerShareTTM: number;
  netIncomePerShareTTM: number;
  operatingCashFlowPerShareTTM: number;
  freeCashFlowPerShareTTM: number;
  cashPerShareTTM: number;
  bookValuePerShareTTM: number;
  tangibleBookValuePerShareTTM: number;
  shareholdersEquityPerShareTTM: number;
  interestDebtPerShareTTM: number;
  marketCapTTM: number;
  enterpriseValueTTM: number;
  peRatioTTM: number;
  priceToSalesRatioTTM: number;
  pocfratioTTM: number;
  pfcfRatioTTM: number;
  pbRatioTTM: number;
  ptbRatioTTM: number;
  evToSalesTTM: number;
  enterpriseValueOverEBITDATTM: number;
  evToOperatingCashFlowTTM: number;
  evToFreeCashFlowTTM: number;
  earningsYieldTTM: number;
  freeCashFlowYieldTTM: number;
  debtToEquityTTM: number;
  debtToAssetsTTM: number;
  netDebtToEBITDATTM: number;
  currentRatioTTM: number;
  interestCoverageTTM: number;
  incomeQualityTTM: number;
  dividendYieldTTM: number;
  payoutRatioTTM: number;
  salesGeneralAndAdministrativeToRevenueTTM: number;
  researchAndDevelopementToRevenueTTM: number;
  intangiblesToTotalAssetsTTM: number;
  capexToOperatingCashFlowTTM: number;
  capexToRevenueTTM: number;
  capexToDepreciationTTM: number;
  stockBasedCompensationToRevenueTTM: number;
  grahamNumberTTM: number;
  roicTTM: number;
  returnOnTangibleAssetsTTM: number;
  grahamNetNetTTM: number;
  workingCapitalTTM: number;
  tangibleAssetValueTTM: number;
  netCurrentAssetValueTTM: number;
  investedCapitalTTM: number;
  averageReceivablesTTM: number;
  averagePayablesTTM: number;
  averageInventoryTTM: number;
  daysSalesOutstandingTTM: number;
  daysPayablesOutstandingTTM: number;
  daysOfInventoryOnHandTTM: number;
  receivablesTurnoverTTM: number;
  payablesTurnoverTTM: number;
  inventoryTurnoverTTM: number;
  roeTTM: number;
  capexPerShareTTM: number;
}

export interface FMPFinancialRatios {
  symbol: string;
  date: string;
  period: string;
  currentRatio: number;
  quickRatio: number;
  cashRatio: number;
  daysOfSalesOutstanding: number;
  daysOfInventoryOutstanding: number;
  operatingCycle: number;
  daysOfPayablesOutstanding: number;
  cashConversionCycle: number;
  grossProfitMargin: number;
  operatingProfitMargin: number;
  pretaxProfitMargin: number;
  netProfitMargin: number;
  effectiveTaxRate: number;
  returnOnAssets: number;
  returnOnEquity: number;
  returnOnCapitalEmployed: number;
  netIncomePerEBT: number;
  ebtPerEbit: number;
  ebitPerRevenue: number;
  debtRatio: number;
  debtEquityRatio: number;
  longTermDebtToCapitalization: number;
  totalDebtToCapitalization: number;
  interestCoverage: number;
  cashFlowToDebtRatio: number;
  companyEquityMultiplier: number;
  receivablesTurnover: number;
  payablesTurnover: number;
  inventoryTurnover: number;
  fixedAssetTurnover: number;
  assetTurnover: number;
  operatingCashFlowPerShare: number;
  freeCashFlowPerShare: number;
  cashPerShare: number;
  payoutRatio: number;
  operatingCashFlowSalesRatio: number;
  freeCashFlowOperatingCashFlowRatio: number;
  cashFlowCoverageRatios: number;
  shortTermCoverageRatios: number;
  capitalExpenditureCoverageRatio: number;
  dividendPaidAndCapexCoverageRatio: number;
  dividendPayoutRatio: number;
  priceBookValueRatio: number;
  priceToBookRatio: number;
  priceToSalesRatio: number;
  priceEarningsRatio: number;
  priceToFreeCashFlowsRatio: number;
  priceToOperatingCashFlowsRatio: number;
  priceCashFlowRatio: number;
  priceEarningsToGrowthRatio: number;
  priceSalesRatio: number;
  dividendYield: number;
  enterpriseValueMultiple: number;
  priceFairValue: number;
}

/**
 * Fetch list of tradable stocks from FMP
 * This replaces the deprecated stock-screener endpoint
 * @returns Array of tradable stocks
 */
export async function fetchFMPTradableStocks(): Promise<FMPTradableStock[]> {
  const apiKey = process.env.FMP_API_KEY;

  if (!apiKey) {
    console.warn('[FMP] API key not configured');
    return [];
  }

  const url = `${FMP_BASE_URL}/available-traded/list?apikey=${apiKey}`;

  console.log(`[FMP] Fetching tradable stocks list: ${url.replace(apiKey, 'API_KEY_HIDDEN')}`);

  try {
    const response = await fetch(url);

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[FMP] API Error ${response.status}:`, errorText);
      throw new Error(`FMP API returned status ${response.status}: ${errorText}`);
    }

    const data = await response.json();

    if (Array.isArray(data)) {
      console.log(`[FMP] Tradable stocks list returned ${data.length} results`);
      return data;
    }

    // Check for error response
    if (data.error || data['Error Message']) {
      const errorMsg = data.error || data['Error Message'];
      console.error('[FMP] API Error Response:', errorMsg);
      throw new Error(`FMP API Error: ${errorMsg}`);
    }

    console.warn('[FMP] Unexpected response format:', data);
    return [];
  } catch (error) {
    console.error('[FMP] Tradable stocks list error:', error);
    throw error;
  }
}

/**
 * Fetch stocks using FMP stock screener (DEPRECATED - kept for backwards compatibility)
 * @param params - Screening parameters
 * @returns Array of stocks matching the criteria
 * @deprecated Stock Screener API is deprecated as of August 31, 2025. Use fetchFMPTradableStocks instead.
 */
export async function fetchFMPStockScreener(
  params: FMPScreenerParams = {}
): Promise<FMPStockScreenerResult[]> {
  const apiKey = process.env.FMP_API_KEY;

  if (!apiKey) {
    console.warn('[FMP] API key not configured, using sample data');
    return [];
  }

  // Build query parameters
  const queryParams = new URLSearchParams();

  // Add all provided parameters
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      queryParams.append(key, value.toString());
    }
  });

  // Add API key
  queryParams.append('apikey', apiKey);

  const url = `${FMP_BASE_URL}/stock-screener?${queryParams.toString()}`;

  console.log(`[FMP] Fetching stock screener: ${url.replace(apiKey, 'API_KEY_HIDDEN')}`);

  try {
    const response = await fetch(url);

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[FMP] API Error ${response.status}:`, errorText);
      throw new Error(`FMP API returned status ${response.status}: ${errorText}`);
    }

    const data = await response.json();

    if (Array.isArray(data)) {
      console.log(`[FMP] Stock screener returned ${data.length} results`);
      return data;
    }

    // Check for error response
    if (data.error || data['Error Message']) {
      const errorMsg = data.error || data['Error Message'];
      console.error('[FMP] API Error Response:', errorMsg);
      throw new Error(`FMP API Error: ${errorMsg}`);
    }

    console.warn('[FMP] Unexpected response format:', data);
    return [];
  } catch (error) {
    console.error('[FMP] Stock screener error:', error);
    throw error;
  }
}

/**
 * Fetch key metrics for a single stock (TTM - Trailing Twelve Months)
 * @param symbol - Stock symbol
 * @returns Key metrics data
 */
export async function fetchFMPKeyMetrics(symbol: string): Promise<FMPKeyMetrics | null> {
  const apiKey = process.env.FMP_API_KEY;

  if (!apiKey) {
    console.warn('[FMP] API key not configured');
    return null;
  }

  const url = `${FMP_BASE_URL}/key-metrics-ttm/${symbol}?apikey=${apiKey}`;

  try {
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`FMP API returned status ${response.status}`);
    }

    const data = await response.json();

    if (Array.isArray(data) && data.length > 0) {
      return data[0];
    }

    return null;
  } catch (error) {
    console.error(`[FMP] Key metrics error for ${symbol}:`, error);
    return null;
  }
}

/**
 * Fetch financial ratios for a single stock (TTM - Trailing Twelve Months)
 * @param symbol - Stock symbol
 * @returns Financial ratios data
 */
export async function fetchFMPFinancialRatios(symbol: string): Promise<FMPFinancialRatios | null> {
  const apiKey = process.env.FMP_API_KEY;

  if (!apiKey) {
    console.warn('[FMP] API key not configured');
    return null;
  }

  const url = `${FMP_BASE_URL}/ratios-ttm/${symbol}?apikey=${apiKey}`;

  try {
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`FMP API returned status ${response.status}`);
    }

    const data = await response.json();

    if (Array.isArray(data) && data.length > 0) {
      return data[0];
    }

    return null;
  } catch (error) {
    console.error(`[FMP] Financial ratios error for ${symbol}:`, error);
    return null;
  }
}

/**
 * Fetch multiple stocks' key metrics in parallel
 * @param symbols - Array of stock symbols
 * @returns Map of symbol to key metrics
 */
export async function fetchFMPKeyMetricsBatch(
  symbols: string[]
): Promise<Map<string, FMPKeyMetrics>> {
  const results = new Map<string, FMPKeyMetrics>();

  // Fetch in parallel
  const promises = symbols.map(async (symbol) => {
    const metrics = await fetchFMPKeyMetrics(symbol);
    if (metrics) {
      results.set(symbol, metrics);
    }
  });

  await Promise.all(promises);

  return results;
}

/**
 * Fetch multiple stocks' financial ratios in parallel
 * @param symbols - Array of stock symbols
 * @returns Map of symbol to financial ratios
 */
export async function fetchFMPFinancialRatiosBatch(
  symbols: string[]
): Promise<Map<string, FMPFinancialRatios>> {
  const results = new Map<string, FMPFinancialRatios>();

  // Fetch in parallel
  const promises = symbols.map(async (symbol) => {
    const ratios = await fetchFMPFinancialRatios(symbol);
    if (ratios) {
      results.set(symbol, ratios);
    }
  });

  await Promise.all(promises);

  return results;
}

/**
 * Combined stock data from screener, key metrics, and financial ratios
 */
export interface FMPCombinedStockData {
  screener: FMPStockScreenerResult;
  keyMetrics?: FMPKeyMetrics;
  ratios?: FMPFinancialRatios;
}

/**
 * Fetch comprehensive stock data including screener results, key metrics, and financial ratios
 * @param screenerParams - Stock screener parameters
 * @param fetchDetailedData - Whether to fetch key metrics and ratios (default: false to save API calls)
 * @returns Array of combined stock data
 */
/**
 * NEW: Convert tradable stocks to screener format
 * Since stock-screener API is deprecated, we use available-traded/list
 * and convert the simpler format to the expected screener format
 */
function convertTradableStockToScreenerFormat(stock: FMPTradableStock): FMPStockScreenerResult {
  return {
    symbol: stock.symbol,
    companyName: stock.name,
    price: stock.price,
    exchange: stock.exchange,
    exchangeShortName: stock.exchangeShortName || stock.exchange,
    // Default values for fields not provided by tradable stocks API
    marketCap: 0, // Will be filtered out if needed
    sector: 'Unknown',
    industry: 'Unknown',
    beta: 0,
    lastAnnualDividend: 0,
    volume: 0,
    country: 'US',
    isEtf: stock.type === 'etf',
    isActivelyTrading: true,
  };
}

export async function fetchFMPComprehensiveStockData(
  screenerParams: FMPScreenerParams = {},
  fetchDetailedData: boolean = false
): Promise<FMPCombinedStockData[]> {
  console.log('[FMP] Fetching comprehensive stock data...');

  // Step 1: Get stocks using NEW available-traded/list endpoint
  // (stock-screener is deprecated as of August 31, 2025)
  console.log('[FMP] Using available-traded/list endpoint (stock-screener deprecated)');
  const tradableStocks = await fetchFMPTradableStocks();

  if (tradableStocks.length === 0) {
    console.log('[FMP] No tradable stocks found');
    return [];
  }

  console.log(`[FMP] Got ${tradableStocks.length} tradable stocks`);

  // Convert to screener format for compatibility
  let screenerResults = tradableStocks.map(convertTradableStockToScreenerFormat);

  // Apply basic filtering from screenerParams
  if (screenerParams.exchange) {
    screenerResults = screenerResults.filter(s =>
      s.exchangeShortName?.toLowerCase() === screenerParams.exchange?.toLowerCase() ||
      s.exchange?.toLowerCase() === screenerParams.exchange?.toLowerCase()
    );
  }

  if (screenerParams.isEtf !== undefined) {
    screenerResults = screenerResults.filter(s => s.isEtf === screenerParams.isEtf);
  }

  if (screenerParams.priceMoreThan) {
    screenerResults = screenerResults.filter(s => s.price >= screenerParams.priceMoreThan!);
  }

  if (screenerParams.priceLowerThan) {
    screenerResults = screenerResults.filter(s => s.price <= screenerParams.priceLowerThan!);
  }

  // Apply limit
  if (screenerParams.limit && screenerResults.length > screenerParams.limit) {
    screenerResults = screenerResults.slice(0, screenerParams.limit);
  }

  console.log(`[FMP] After filtering: ${screenerResults.length} stocks`);

  // OLD CODE (using deprecated stock-screener):
  // const screenerResults = await fetchFMPStockScreener(screenerParams);

  if (screenerResults.length === 0) {
    console.log('[FMP] No stocks found in screener');
    return [];
  }

  console.log(`[FMP] Got ${screenerResults.length} stocks from screener`);

  // Step 2: If detailed data not requested, return screener data only
  if (!fetchDetailedData) {
    console.log('[FMP] Returning screener data only (detailed data not requested)');
    return screenerResults.map((screener) => ({ screener }));
  }

  // Step 3: Fetch key metrics and ratios for each stock (in parallel, with batching)
  // WARNING: This can consume many API calls. Free tier allows 250 calls/day.
  console.log('[FMP] Fetching detailed metrics and ratios...');
  const batchSize = 25; // Smaller batch size to avoid rate limits
  const allResults: FMPCombinedStockData[] = [];

  for (let i = 0; i < screenerResults.length; i += batchSize) {
    const batch = screenerResults.slice(i, i + batchSize);
    const symbols = batch.map((s) => s.symbol);

    console.log(
      `[FMP] Processing batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(screenerResults.length / batchSize)} (${symbols.length} stocks)`
    );

    // Fetch key metrics and ratios in parallel
    const [keyMetricsMap, ratiosMap] = await Promise.all([
      fetchFMPKeyMetricsBatch(symbols),
      fetchFMPFinancialRatiosBatch(symbols),
    ]);

    // Combine data
    const batchResults = batch.map((screenerData) => ({
      screener: screenerData,
      keyMetrics: keyMetricsMap.get(screenerData.symbol),
      ratios: ratiosMap.get(screenerData.symbol),
    }));

    allResults.push(...batchResults);

    // Delay between batches to avoid rate limits
    if (i + batchSize < screenerResults.length) {
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
  }

  console.log(`[FMP] Comprehensive data fetched for ${allResults.length} stocks`);

  return allResults;
}
