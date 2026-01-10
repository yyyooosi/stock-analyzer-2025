import { NextRequest, NextResponse } from 'next/server';
import { fetchYahooQuote } from '@/app/utils/yahooFinance';

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

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const symbol = searchParams.get('symbol');

    if (!symbol) {
      return NextResponse.json(
        { error: 'Symbol parameter is required' },
        { status: 400 }
      );
    }

    const apiKey = process.env.ALPHA_VANTAGE_API_KEY;
    let data: AlphaVantageGlobalQuote;
    let source = 'alpha_vantage';

    // Try Alpha Vantage first if API key is configured
    if (apiKey) {
      try {
        data = await fetchFromAlphaVantage(symbol, apiKey);
        console.log(`[Quote] Alpha Vantage success for ${symbol}`);
      } catch (alphaError) {
        console.warn(`[Quote] Alpha Vantage failed for ${symbol}:`, alphaError);
        // Fall back to Yahoo Finance
        try {
          data = await fetchFromYahooFinance(symbol);
          source = 'yahoo_finance';
          console.log(`[Quote] Yahoo Finance fallback success for ${symbol}`);
        } catch (yahooError) {
          console.error(`[Quote] Yahoo Finance also failed for ${symbol}:`, yahooError);
          return NextResponse.json(
            { error: 'Stock symbol not found', symbol },
            { status: 404 }
          );
        }
      }
    } else {
      // No Alpha Vantage key, use Yahoo Finance directly
      try {
        data = await fetchFromYahooFinance(symbol);
        source = 'yahoo_finance';
        console.log(`[Quote] Yahoo Finance (primary) success for ${symbol}`);
      } catch (yahooError) {
        console.error(`[Quote] Yahoo Finance failed for ${symbol}:`, yahooError);
        return NextResponse.json(
          { error: 'Stock symbol not found', symbol },
          { status: 404 }
        );
      }
    }

    return NextResponse.json({ ...data, source });
  } catch (error) {
    console.error('Stock quote API error:', error);
    return NextResponse.json(
      {
        error: 'Failed to fetch stock quote',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
