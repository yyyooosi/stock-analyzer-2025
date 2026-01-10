import { NextRequest, NextResponse } from 'next/server';
import { fetchYahooHistorical } from '@/app/utils/yahooFinance';

interface AlphaVantageTimeSeries {
  'Meta Data': {
    '1. Information': string;
    '2. Symbol': string;
    '3. Last Refreshed': string;
    '4. Output Size': string;
    '5. Time Zone': string;
  };
  'Time Series (Daily)': {
    [date: string]: {
      '1. open': string;
      '2. high': string;
      '3. low': string;
      '4. close': string;
      '5. volume': string;
    };
  };
}

async function fetchFromAlphaVantage(symbol: string, apiKey: string): Promise<AlphaVantageTimeSeries> {
  const url = `https://www.alphavantage.co/query?function=TIME_SERIES_DAILY&symbol=${symbol}&apikey=${apiKey}`;
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

  if (!data['Time Series (Daily)']) {
    throw new Error('Stock symbol not found or no data available');
  }

  return data;
}

async function fetchFromYahooFinance(symbol: string): Promise<AlphaVantageTimeSeries> {
  const historical = await fetchYahooHistorical(symbol, 100);

  // Convert Yahoo Finance format to Alpha Vantage format for compatibility
  const timeSeries: AlphaVantageTimeSeries['Time Series (Daily)'] = {};

  for (const item of historical) {
    timeSeries[item.date] = {
      '1. open': item.open.toString(),
      '2. high': item.high.toString(),
      '3. low': item.low.toString(),
      '4. close': item.close.toString(),
      '5. volume': item.volume.toString(),
    };
  }

  const lastDate = historical.length > 0 ? historical[0].date : new Date().toISOString().split('T')[0];

  return {
    'Meta Data': {
      '1. Information': 'Daily Prices (open, high, low, close) and Volumes',
      '2. Symbol': symbol,
      '3. Last Refreshed': lastDate,
      '4. Output Size': 'Compact',
      '5. Time Zone': 'US/Eastern',
    },
    'Time Series (Daily)': timeSeries,
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
    let data: AlphaVantageTimeSeries;
    let source = 'alpha_vantage';

    // Try Alpha Vantage first if API key is configured
    if (apiKey) {
      try {
        data = await fetchFromAlphaVantage(symbol, apiKey);
        console.log(`[TimeSeries] Alpha Vantage success for ${symbol}`);
      } catch (alphaError) {
        console.warn(`[TimeSeries] Alpha Vantage failed for ${symbol}:`, alphaError);
        // Fall back to Yahoo Finance
        try {
          data = await fetchFromYahooFinance(symbol);
          source = 'yahoo_finance';
          console.log(`[TimeSeries] Yahoo Finance fallback success for ${symbol}`);
        } catch (yahooError) {
          console.error(`[TimeSeries] Yahoo Finance also failed for ${symbol}:`, yahooError);
          return NextResponse.json(
            { error: 'Stock symbol not found or no data available', symbol },
            { status: 404 }
          );
        }
      }
    } else {
      // No Alpha Vantage key, use Yahoo Finance directly
      try {
        data = await fetchFromYahooFinance(symbol);
        source = 'yahoo_finance';
        console.log(`[TimeSeries] Yahoo Finance (primary) success for ${symbol}`);
      } catch (yahooError) {
        console.error(`[TimeSeries] Yahoo Finance failed for ${symbol}:`, yahooError);
        return NextResponse.json(
          { error: 'Stock symbol not found or no data available', symbol },
          { status: 404 }
        );
      }
    }

    return NextResponse.json({ ...data, source });
  } catch (error) {
    console.error('Stock time series API error:', error);
    return NextResponse.json(
      {
        error: 'Failed to fetch stock time series',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
