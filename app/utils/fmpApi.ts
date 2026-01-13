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
 * Response from /api/v3/available-traded/list endpoint (DEPRECATED - Legacy as of Aug 31, 2025)
 */
export interface FMPTradableStock {
  symbol: string;
  name: string;
  price: number;
  exchange: string;
  exchangeShortName?: string;
  type?: string; // "stock", "etf", "trust", etc.
}

/**
 * Response from /api/v3/quote/{symbols} endpoint
 * Get quotes for multiple stocks (comma-separated symbols)
 * This is a WORKING endpoint (not Legacy) for free tier as of 2026
 */
export interface FMPQuote {
  symbol: string;
  name: string;
  price: number;
  changesPercentage: number;
  change: number;
  dayLow: number;
  dayHigh: number;
  yearHigh: number;
  yearLow: number;
  marketCap: number;
  priceAvg50: number;
  priceAvg200: number;
  volume: number;
  avgVolume: number;
  exchange: string;
  open: number;
  previousClose: number;
  eps: number;
  pe: number;
  earningsAnnouncement?: string;
  sharesOutstanding: number;
  timestamp: number;
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
 * Fetch list of stock symbols from FMP
 * Uses /api/v3/available-traded/list endpoint (current working endpoint as of 2026)
 * @returns Array of stock symbols
 */
export async function fetchFMPSymbolsList(): Promise<string[]> {
  const apiKey = process.env.FMP_API_KEY;

  if (!apiKey) {
    console.error('[FMP] API key not configured - cannot fetch symbols');
    throw new Error('FMP_API_KEY is not configured');
  }

  // Use available-traded/list endpoint instead of financial-statement-symbol-lists
  // The latter became Legacy after August 31, 2025
  const url = `${FMP_BASE_URL}/available-traded/list?apikey=${apiKey}`;

  console.log(`[FMP] Fetching available traded stocks list (updated endpoint)`);
  console.log(`[FMP] API Key (first 4 chars): ${apiKey.substring(0, 4)}...`);

  try {
    console.log(`[FMP] Calling FMP API: /available-traded/list`);
    const response = await fetch(url);

    console.log(`[FMP] Response status: ${response.status} ${response.statusText}`);

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[FMP] API Error ${response.status}:`, errorText);

      // Specific error messages
      if (response.status === 401) {
        throw new Error(`FMP API authentication failed (401). Please check your API key.`);
      } else if (response.status === 403) {
        throw new Error(`FMP API access forbidden (403). This endpoint may require a paid plan or the endpoint is deprecated.`);
      } else if (response.status === 429) {
        throw new Error(`FMP API rate limit exceeded (429). Free tier allows 250 requests/day.`);
      } else {
        throw new Error(`FMP API returned status ${response.status}: ${errorText}`);
      }
    }

    const data = await response.json();

    // The available-traded/list endpoint returns an array of objects with symbol property
    if (Array.isArray(data)) {
      // Extract symbols from the response
      const symbols = data.map((item: { symbol: string }) => item.symbol).filter(Boolean);
      console.log(`[FMP] Available-traded list returned ${symbols.length} symbols`);
      return symbols;
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
    console.error('[FMP] Symbol lists error:', error);
    throw error;
  }
}

/**
 * Fetch stock quotes for multiple symbols
 * Uses /api/v3/quote/{symbols} endpoint (NOT Legacy, works with free tier)
 * @param symbols - Array of stock symbols or comma-separated string
 * @returns Array of stock quotes
 */
export async function fetchFMPStockQuotes(symbols: string[] | string): Promise<FMPQuote[]> {
  const apiKey = process.env.FMP_API_KEY;

  if (!apiKey) {
    console.error('[FMP] API key not configured - cannot fetch quotes');
    throw new Error('FMP_API_KEY is not configured');
  }

  const symbolsStr = Array.isArray(symbols) ? symbols.join(',') : symbols;
  const url = `${FMP_BASE_URL}/quote/${symbolsStr}?apikey=${apiKey}`;

  console.log(`[FMP] Fetching quotes for ${Array.isArray(symbols) ? symbols.length : 'multiple'} symbols`);

  try {
    const response = await fetch(url);

    console.log(`[FMP] Quote response status: ${response.status} ${response.statusText}`);

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[FMP] API Error ${response.status}:`, errorText);

      // Specific error messages
      if (response.status === 401) {
        throw new Error(`FMP API authentication failed (401). Please check your API key.`);
      } else if (response.status === 429) {
        throw new Error(`FMP API rate limit exceeded (429). Free tier allows 250 requests/day.`);
      } else {
        throw new Error(`FMP API returned status ${response.status}: ${errorText}`);
      }
    }

    const data = await response.json();

    if (Array.isArray(data)) {
      console.log(`[FMP] Quotes returned ${data.length} results`);
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
    console.error('[FMP] Stock quotes error:', error);
    throw error;
  }
}

/**
 * DEPRECATED: Fetch list of tradable stocks from FMP
 * @deprecated available-traded/list is a Legacy endpoint. Use fetchFMPSymbolsList instead.
 */
export async function fetchFMPTradableStocks(): Promise<FMPTradableStock[]> {
  console.warn('[FMP] fetchFMPTradableStocks is deprecated. Use fetchFMPSymbolsList + fetchFMPStockQuotes instead.');

  const apiKey = process.env.FMP_API_KEY;
  if (!apiKey) {
    return [];
  }

  const url = `${FMP_BASE_URL}/available-traded/list?apikey=${apiKey}`;

  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`FMP API returned status ${response.status}`);
    }
    const data = await response.json();
    if (Array.isArray(data)) {
      return data;
    }
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
  quote?: FMPQuote; // Add quote data for additional metrics (PE, SMA, etc.)
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
  console.log('[FMP] Fetching comprehensive stock data using current working endpoints...');

  // Step 1: Get stock symbols from working endpoints
  // UPDATED 2026: Use available-traded/list endpoint (replaces financial-statement-symbol-lists which became Legacy)
  console.log('[FMP] Using available-traded/list endpoint (current working endpoint)');

  let symbols = await fetchFMPSymbolsList();

  if (symbols.length === 0) {
    console.log('[FMP] No symbols found from symbol lists');
    return [];
  }

  console.log(`[FMP] Got ${symbols.length} symbols from symbol lists`);

  // Step 2: Limit symbols to reasonable number for free tier (250 requests/day)
  // Get quotes in batches of 100 symbols at a time
  const limit = screenerParams.limit || 1000;
  const symbolsToFetch = symbols.slice(0, Math.min(limit, 1000));

  console.log(`[FMP] Fetching quotes for ${symbolsToFetch.length} symbols`);

  // Batch symbols into groups of 100 for quote API
  const quoteBatchSize = 100;
  const quoteBatches: FMPQuote[][] = [];

  for (let i = 0; i < symbolsToFetch.length; i += quoteBatchSize) {
    const batch = symbolsToFetch.slice(i, i + quoteBatchSize);
    console.log(`[FMP] Fetching quote batch ${Math.floor(i / quoteBatchSize) + 1}/${Math.ceil(symbolsToFetch.length / quoteBatchSize)}`);

    const quotes = await fetchFMPStockQuotes(batch);
    quoteBatches.push(quotes);

    // Small delay to avoid rate limits
    if (i + quoteBatchSize < symbolsToFetch.length) {
      await new Promise(resolve => setTimeout(resolve, 500));
    }
  }

  const allQuotes = quoteBatches.flat();
  console.log(`[FMP] Got ${allQuotes.length} quotes`);

  // Create a map for quick quote lookup
  const quoteMap = new Map<string, FMPQuote>();
  allQuotes.forEach(quote => quoteMap.set(quote.symbol, quote));

  // Convert quotes to screener format for compatibility
  let screenerResults: FMPStockScreenerResult[] = allQuotes.map(quote => ({
    symbol: quote.symbol,
    companyName: quote.name,
    price: quote.price,
    marketCap: quote.marketCap,
    volume: quote.volume,
    exchange: quote.exchange,
    exchangeShortName: quote.exchange,
    sector: 'Unknown', // Not available in quote endpoint
    industry: 'Unknown',
    beta: 0,
    lastAnnualDividend: 0,
    country: 'US',
    isEtf: false,
    isActivelyTrading: true,
  }));

  // Apply basic filtering from screenerParams
  if (screenerParams.exchange) {
    screenerResults = screenerResults.filter(s =>
      s.exchange?.toLowerCase().includes(screenerParams.exchange?.toLowerCase() || '')
    );
  }

  if (screenerParams.marketCapMoreThan) {
    screenerResults = screenerResults.filter(s => s.marketCap >= screenerParams.marketCapMoreThan!);
  }

  if (screenerParams.marketCapLowerThan) {
    screenerResults = screenerResults.filter(s => s.marketCap <= screenerParams.marketCapLowerThan!);
  }

  if (screenerParams.priceMoreThan) {
    screenerResults = screenerResults.filter(s => s.price >= screenerParams.priceMoreThan!);
  }

  if (screenerParams.priceLowerThan) {
    screenerResults = screenerResults.filter(s => s.price <= screenerParams.priceLowerThan!);
  }

  if (screenerParams.volumeMoreThan) {
    screenerResults = screenerResults.filter(s => s.volume >= screenerParams.volumeMoreThan!);
  }

  console.log(`[FMP] After filtering: ${screenerResults.length} stocks`);

  if (screenerResults.length === 0) {
    console.log('[FMP] No stocks found in screener');
    return [];
  }

  console.log(`[FMP] Got ${screenerResults.length} stocks from screener`);

  // Step 2: If detailed data not requested, return screener data with quote data
  if (!fetchDetailedData) {
    console.log('[FMP] Returning screener data with quote data (detailed data not requested)');
    return screenerResults.map((screener) => ({
      screener,
      quote: quoteMap.get(screener.symbol),
    }));
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
      quote: quoteMap.get(screenerData.symbol),
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
