/**
 * Mapper functions to convert FMP API data to StockFundamentals format
 */

import type { StockFundamentals } from './screener';
import type { FMPCombinedStockData } from './fmpApi';

/**
 * Map FMP combined stock data to StockFundamentals format
 * @param fmpData - Combined FMP data (screener + optional quote + key metrics + ratios)
 * @returns StockFundamentals object
 *
 * Note: Quote data provides PE, SMA50, SMA200, EPS which are sufficient for basic screening.
 * When keyMetrics and ratios are not provided (to save API calls),
 * we rely on quote data for most valuation metrics.
 */
export function mapFMPDataToStockFundamentals(fmpData: FMPCombinedStockData): StockFundamentals {
  const { screener, quote, keyMetrics, ratios } = fmpData;

  // Basic info
  const stock: StockFundamentals = {
    symbol: screener.symbol,
    name: screener.companyName,
    sector: screener.sector || 'Unknown',
    industry: screener.industry || 'Unknown',
    marketCap: screener.marketCap || 0,
    marketCapUSD: screener.marketCap || 0,
    price: screener.price || 0,
    change: quote?.change ?? 0,
    changePercent: quote?.changesPercentage ?? 0,

    // Valuation metrics - prioritize quote data, then key metrics, then ratios
    per: quote?.pe ?? keyMetrics?.peRatioTTM ?? ratios?.priceEarningsRatio ?? null,
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
    dividendYield: keyMetrics?.dividendYieldTTM ?? ratios?.dividendYield ?? (screener.lastAnnualDividend && screener.price > 0 ? screener.lastAnnualDividend / screener.price : null),
    consecutiveDividendYears: null, // FMP doesn't provide this in free tier
    payoutRatio: keyMetrics?.payoutRatioTTM ?? ratios?.payoutRatio ?? null,

    // Technical indicators - use quote data when available
    sma50: quote?.priceAvg50 ?? null,
    sma200: quote?.priceAvg200 ?? null,
    rsi: null, // Not available from FMP quote endpoint
    macdSignal: 'neutral', // Not available from FMP quote endpoint
    volumeChange: quote && quote.avgVolume > 0 ? ((quote.volume - quote.avgVolume) / quote.avgVolume) * 100 : null,
    week52High: quote?.yearHigh ?? null,
    week52HighDistance: quote && quote.yearHigh > 0 ? ((quote.price - quote.yearHigh) / quote.yearHigh) * 100 : null,

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
