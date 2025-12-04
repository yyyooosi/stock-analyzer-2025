import { NextRequest, NextResponse } from 'next/server';

const ALPHA_VANTAGE_API_KEY = process.env.ALPHA_VANTAGE_API_KEY;
const ALPHA_VANTAGE_BASE_URL = 'https://www.alphavantage.co/query';

// Rate limiting for search endpoint
class SearchRateLimiter {
  private requests: number[] = [];
  private readonly maxRequests = 5;
  private readonly timeWindow = 60000; // 1分

  canMakeRequest(): boolean {
    const now = Date.now();
    this.requests = this.requests.filter(time => now - time < this.timeWindow);
    return this.requests.length < this.maxRequests;
  }

  recordRequest(): void {
    this.requests.push(Date.now());
  }

  getWaitTime(): number {
    if (this.requests.length === 0) return 0;
    const oldestRequest = Math.min(...this.requests);
    const waitTime = this.timeWindow - (Date.now() - oldestRequest);
    return Math.max(0, Math.ceil(waitTime / 1000));
  }
}

const searchRateLimiter = new SearchRateLimiter();

export interface StockSearchResult {
  symbol: string;
  name: string;
  type: string;
  region: string;
  currency: string;
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const query = searchParams.get('q');

    if (!query || query.trim().length === 0) {
      return NextResponse.json(
        { error: '検索キーワードを入力してください' },
        { status: 400 }
      );
    }

    if (query.trim().length < 1) {
      return NextResponse.json(
        { results: [] },
        { status: 200 }
      );
    }

    // Check rate limiting
    if (!searchRateLimiter.canMakeRequest()) {
      const waitTime = searchRateLimiter.getWaitTime();
      return NextResponse.json(
        {
          error: `APIのレート制限に達しました。${waitTime}秒後に再試行してください。`,
          waitTime
        },
        { status: 429 }
      );
    }

    if (!ALPHA_VANTAGE_API_KEY) {
      console.error('ALPHA_VANTAGE_API_KEY is not configured');
      return NextResponse.json(
        { error: 'APIキーが設定されていません' },
        { status: 500 }
      );
    }

    // Call Alpha Vantage SYMBOL_SEARCH function
    const url = `${ALPHA_VANTAGE_BASE_URL}?function=SYMBOL_SEARCH&keywords=${encodeURIComponent(query)}&apikey=${ALPHA_VANTAGE_API_KEY}`;

    searchRateLimiter.recordRequest();

    const response = await fetch(url);
    const data = await response.json();

    // Check for API errors
    if (data['Error Message']) {
      return NextResponse.json(
        { error: 'APIエラーが発生しました', details: data['Error Message'] },
        { status: 400 }
      );
    }

    if (data['Note']) {
      return NextResponse.json(
        { error: 'APIのレート制限に達しました。しばらく待ってから再試行してください。' },
        { status: 429 }
      );
    }

    // Parse results
    const bestMatches = data['bestMatches'] || [];

    // Filter for US stocks only and format results
    const results: StockSearchResult[] = bestMatches
      .filter((match: any) => {
        // Only include US stocks
        return match['4. region'] === 'United States';
      })
      .map((match: any) => ({
        symbol: match['1. symbol'],
        name: match['2. name'],
        type: match['3. type'],
        region: match['4. region'],
        currency: match['8. currency']
      }))
      .slice(0, 10); // Limit to top 10 results

    return NextResponse.json({
      results,
      query
    });

  } catch (error) {
    console.error('Stock search error:', error);
    return NextResponse.json(
      { error: '株式検索中にエラーが発生しました' },
      { status: 500 }
    );
  }
}
