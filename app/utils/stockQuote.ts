import { fetchYahooQuote } from './yahooFinance';

export interface StockQuoteData {
  symbol: string;
  price: number;
  change: number;
  changePercent: number;
  open: number;
  high: number;
  low: number;
  volume: number;
  previousClose: number;
  latestTradingDay: string;
}

interface AlphaVantageGlobalQuote {
  'Global Quote': {
    '01. symbol': string;
    '02. open': string;
    '03. high': string;
    '04. low': string;
    '05. price': string;
    '06. volume': string;
    '07. latest trading day': string;
    '08. previous close': string;
    '09. change': string;
    '10. change percent': string;
  };
}

async function fetchFromAlphaVantage(symbol: string, apiKey: string): Promise<AlphaVantageGlobalQuote> {
  const url = `https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol=${symbol}&apikey=${apiKey}`;
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`Alpha Vantage API returned status ${response.status}`);
  }

  const data = await response.json();

  if ('Error Message' in data) {
    throw new Error('Invalid stock symbol or API error');
  }

  if ('Note' in data) {
    throw new Error('API rate limit exceeded');
  }

  if (!data['Global Quote'] || Object.keys(data['Global Quote']).length === 0) {
    throw new Error('Stock symbol not found');
  }

  return data;
}

async function fetchFromYahooFinance(symbol: string): Promise<AlphaVantageGlobalQuote> {
  const quote = await fetchYahooQuote(symbol);

  // Convert Yahoo Finance format to Alpha Vantage format for compatibility
  return {
    'Global Quote': {
      '01. symbol': quote.symbol,
      '02. open': quote.open.toString(),
      '03. high': quote.high.toString(),
      '04. low': quote.low.toString(),
      '05. price': quote.price.toString(),
      '06. volume': quote.volume.toString(),
      '07. latest trading day': quote.latestTradingDay,
      '08. previous close': quote.previousClose.toString(),
      '09. change': quote.change.toString(),
      '10. change percent': `${quote.changePercent.toFixed(4)}%`,
    },
  };
}

/**
 * 株価データを取得（Alpha Vantage → Yahoo Finance フォールバック）
 * @param symbol 株式シンボル
 * @returns 株価データ
 */
export async function fetchStockQuote(symbol: string): Promise<StockQuoteData> {
  const apiKey = process.env.ALPHA_VANTAGE_API_KEY;
  let data: AlphaVantageGlobalQuote;

  // Try Alpha Vantage first if API key is configured
  if (apiKey) {
    try {
      data = await fetchFromAlphaVantage(symbol, apiKey);
      console.log(`[StockQuote] Alpha Vantage success for ${symbol}`);
    } catch (alphaError) {
      console.warn(`[StockQuote] Alpha Vantage failed for ${symbol}:`, alphaError);
      // Fall back to Yahoo Finance
      data = await fetchFromYahooFinance(symbol);
      console.log(`[StockQuote] Yahoo Finance fallback success for ${symbol}`);
    }
  } else {
    // No Alpha Vantage key, use Yahoo Finance directly
    data = await fetchFromYahooFinance(symbol);
    console.log(`[StockQuote] Yahoo Finance (primary) success for ${symbol}`);
  }

  const quote = data['Global Quote'];

  return {
    symbol: quote['01. symbol'],
    price: parseFloat(quote['05. price']),
    change: parseFloat(quote['09. change']),
    changePercent: parseFloat(quote['10. change percent'].replace('%', '')),
    open: parseFloat(quote['02. open']),
    high: parseFloat(quote['03. high']),
    low: parseFloat(quote['04. low']),
    volume: parseInt(quote['06. volume']),
    previousClose: parseFloat(quote['08. previous close']),
    latestTradingDay: quote['07. latest trading day'],
  };
}
