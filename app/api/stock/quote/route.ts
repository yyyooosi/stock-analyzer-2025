import { NextRequest, NextResponse } from 'next/server';

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

    const url = `https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol=${symbol}&apikey=${apiKey}`;
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`Alpha Vantage API returned status ${response.status}`);
    }

    const data: AlphaVantageGlobalQuote = await response.json();

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

    if (!data['Global Quote'] || Object.keys(data['Global Quote']).length === 0) {
      return NextResponse.json(
        { error: 'Stock symbol not found', symbol },
        { status: 404 }
      );
    }

    return NextResponse.json(data);
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
