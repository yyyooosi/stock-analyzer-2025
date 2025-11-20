import { NextRequest, NextResponse } from 'next/server';

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
    if (!apiKey) {
      return NextResponse.json(
        { error: 'Alpha Vantage API key is not configured' },
        { status: 500 }
      );
    }

    const url = `https://www.alphavantage.co/query?function=TIME_SERIES_DAILY&symbol=${symbol}&apikey=${apiKey}`;
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`Alpha Vantage API returned status ${response.status}`);
    }

    const data: AlphaVantageTimeSeries = await response.json();

    // Check for API errors
    if ('Error Message' in data) {
      return NextResponse.json(
        { error: 'Invalid stock symbol or API error', details: data },
        { status: 400 }
      );
    }

    if ('Note' in data) {
      // Rate limit message
      return NextResponse.json(
        { error: 'API rate limit exceeded. Please try again later.', details: data },
        { status: 429 }
      );
    }

    if (!data['Time Series (Daily)']) {
      return NextResponse.json(
        { error: 'Stock symbol not found or no data available', symbol },
        { status: 404 }
      );
    }

    return NextResponse.json(data);
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
