import YahooFinance from 'yahoo-finance2';

// Create Yahoo Finance instance (required for v3)
const yahooFinance = new YahooFinance({ suppressNotices: ['yahooSurvey'] });

export interface YahooQuoteResult {
  symbol: string;
  price: number;
  change: number;
  changePercent: number;
  previousClose: number;
  open: number;
  high: number;
  low: number;
  volume: number;
  latestTradingDay: string;
}

export interface YahooHistoricalResult {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export async function fetchYahooQuote(symbol: string): Promise<YahooQuoteResult> {
  const quote = await yahooFinance.quote(symbol);

  // Type guard to check if quote has the expected properties
  if (!quote || typeof quote !== 'object') {
    throw new Error(`No data found for symbol: ${symbol}`);
  }

  const q = quote as Record<string, unknown>;

  if (!q.regularMarketPrice || typeof q.regularMarketPrice !== 'number') {
    throw new Error(`No price data found for symbol: ${symbol}`);
  }

  return {
    symbol: (q.symbol as string) || symbol,
    price: q.regularMarketPrice as number,
    change: (q.regularMarketChange as number) || 0,
    changePercent: (q.regularMarketChangePercent as number) || 0,
    previousClose: (q.regularMarketPreviousClose as number) || 0,
    open: (q.regularMarketOpen as number) || 0,
    high: (q.regularMarketDayHigh as number) || 0,
    low: (q.regularMarketDayLow as number) || 0,
    volume: (q.regularMarketVolume as number) || 0,
    latestTradingDay: q.regularMarketTime
      ? new Date(q.regularMarketTime as Date).toISOString().split('T')[0]
      : new Date().toISOString().split('T')[0],
  };
}

export async function fetchYahooHistorical(
  symbol: string,
  days: number = 30
): Promise<YahooHistoricalResult[]> {
  const endDate = new Date();
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  const historical = await yahooFinance.chart(symbol, {
    period1: startDate,
    period2: endDate,
    interval: '1d',
  });

  if (!historical || !historical.quotes || historical.quotes.length === 0) {
    throw new Error(`No historical data found for symbol: ${symbol}`);
  }

  return historical.quotes
    .filter((item) => item.close !== null && item.open !== null)
    .map((item) => ({
      date: item.date
        ? new Date(item.date).toISOString().split('T')[0]
        : new Date().toISOString().split('T')[0],
      open: item.open || 0,
      high: item.high || 0,
      low: item.low || 0,
      close: item.close || 0,
      volume: item.volume || 0,
    }));
}
