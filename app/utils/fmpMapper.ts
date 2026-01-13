/**
 * Mapper functions to convert FMP API data to StockFundamentals format
 */

import type { StockFundamentals } from './screener';
import type { FMPCombinedStockData } from './fmpApi';

/**
 * Map FMP combined stock data to StockFundamentals format
 * @param fmpData - Combined FMP data (screener + optional key metrics + ratios)
 * @returns StockFundamentals object
 *
 * Note: When keyMetrics and ratios are not provided (to save API calls),
 * many fields will be null. This is acceptable for initial screening.
 */
export function mapFMPDataToStockFundamentals(fmpData: FMPCombinedStockData): StockFundamentals {
  const { screener, keyMetrics, ratios } = fmpData;

  // Basic info
  const stock: StockFundamentals = {
    symbol: screener.symbol,
    name: screener.companyName,
    sector: screener.sector || 'Unknown',
    industry: screener.industry || 'Unknown',
    marketCap: screener.marketCap || 0,
    marketCapUSD: screener.marketCap || 0,
    price: screener.price || 0,
    change: 0, // Will be updated by real-time price fetch
    changePercent: 0, // Will be updated by real-time price fetch

    // Valuation metrics from key metrics and ratios
    per: keyMetrics?.peRatioTTM ?? ratios?.priceEarningsRatio ?? null,
    pbr: keyMetrics?.pbRatioTTM ?? ratios?.priceToBookRatio ?? null,
    peg: ratios?.priceEarningsToGrowthRatio ?? null,
    psRatio: keyMetrics?.priceToSalesRatioTTM ?? ratios?.priceToSalesRatio ?? null,
    forwardPER: null, // FMP doesn't provide forward P/E in free tier
    evEbitda: keyMetrics?.enterpriseValueOverEBITDATTM ?? null,

    // Growth metrics
    roe: keyMetrics?.roeTTM ?? ratios?.returnOnEquity ?? null,
    epsGrowth3Y: null, // Would need historical data to calculate
    epsGrowth5Y: null, // Would need historical data to calculate
    revenueGrowth: null, // Would need historical data to calculate
    operatingMargin: ratios?.operatingProfitMargin ?? null,
    grossMargin: ratios?.grossProfitMargin ?? null,
    rdExpenseRatio: keyMetrics?.researchAndDevelopementToRevenueTTM ?? null,

    // Financial health metrics
    equityRatio: null, // Need to calculate from debt ratio if available
    currentRatio: keyMetrics?.currentRatioTTM ?? ratios?.currentRatio ?? null,
    debtRatio: null, // Can be derived from debt to equity
    debtToEquity: keyMetrics?.debtToEquityTTM ?? ratios?.debtEquityRatio ?? null,
    operatingCF: keyMetrics?.operatingCashFlowPerShareTTM
      ? keyMetrics.operatingCashFlowPerShareTTM * (screener.marketCap / screener.price)
      : ratios?.operatingCashFlowPerShare
        ? ratios.operatingCashFlowPerShare * (screener.marketCap / screener.price)
        : null,
    freeCashFlow: keyMetrics?.freeCashFlowPerShareTTM
      ? keyMetrics.freeCashFlowPerShareTTM * (screener.marketCap / screener.price)
      : ratios?.freeCashFlowPerShare
        ? ratios.freeCashFlowPerShare * (screener.marketCap / screener.price)
        : null,
    freeCashFlow3YTrend: null, // Would need historical data

    // Dividend metrics
    dividendYield: keyMetrics?.dividendYieldTTM ?? ratios?.dividendYield ?? screener.lastAnnualDividend / screener.price ?? null,
    consecutiveDividendYears: null, // FMP doesn't provide this in free tier
    payoutRatio: keyMetrics?.payoutRatioTTM ?? ratios?.payoutRatio ?? null,

    // Technical indicators (not available from FMP, will need to calculate or fetch separately)
    sma50: null,
    sma200: null,
    rsi: null,
    macdSignal: 'neutral',
    volumeChange: null,
    week52High: null,
    week52HighDistance: null,

    // Twitter/X sentiment (not available from FMP)
    twitterMentionCount30d: null,
    twitterMentionTrend: null,
    twitterSentiment: null,
    hasNegativeKeywords: false,
  };

  // Calculate debt ratio from debt to equity if available
  if (stock.debtToEquity !== null && stock.debtToEquity >= 0) {
    // debt/equity = D/E, so D = debt*E, and total assets = D + E
    // debt ratio = D / (D + E) = (debt*E) / (debt*E + E) = debt / (debt + 1)
    stock.debtRatio = (stock.debtToEquity / (stock.debtToEquity + 1)) * 100;
    stock.equityRatio = 100 - stock.debtRatio;
  }

  // Determine free cash flow trend if we have the data
  if (stock.freeCashFlow !== null) {
    stock.freeCashFlow3YTrend = stock.freeCashFlow > 0 ? 'positive' : stock.freeCashFlow < 0 ? 'negative' : 'neutral';
  }

  return stock;
}

/**
 * Map array of FMP combined data to StockFundamentals array
 * @param fmpDataArray - Array of combined FMP data
 * @returns Array of StockFundamentals
 */
export function mapFMPDataArrayToStockFundamentals(
  fmpDataArray: FMPCombinedStockData[]
): StockFundamentals[] {
  return fmpDataArray.map(mapFMPDataToStockFundamentals);
}

/**
 * Filter out stocks with insufficient data
 * A stock needs at least basic info to be useful for screening
 * @param stocks - Array of StockFundamentals
 * @returns Filtered array with only stocks that have sufficient data
 */
export function filterStocksWithSufficientData(stocks: StockFundamentals[]): StockFundamentals[] {
  return stocks.filter((stock) => {
    // Require at least symbol, name, and price
    // Even without detailed metrics, screener can use market cap, sector, etc.
    const hasBasicInfo = stock.symbol && stock.name && stock.price > 0 && stock.marketCap > 0;

    return hasBasicInfo;
  });
}
