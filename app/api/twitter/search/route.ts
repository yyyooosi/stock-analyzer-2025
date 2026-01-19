import { NextRequest, NextResponse } from 'next/server';
import {
  checkRateLimit,
  getClientIdentifier,
  RateLimitConfigs,
  createRateLimitHeaders,
} from '@/app/utils/rateLimit';
import {
  isValidTwitterQuery,
  sanitizeTwitterQuery,
  parseNumericParam,
} from '@/app/utils/validation';

// Twitter API v2のエンドポイント
const TWITTER_API_BASE = 'https://api.twitter.com/2';

export async function GET(request: NextRequest) {
  // Rate limiting
  const clientId = getClientIdentifier(request);
  const rateLimitResult = checkRateLimit(clientId, RateLimitConfigs.twitter);

  if (!rateLimitResult.allowed) {
    return NextResponse.json(
      { error: 'Rate limit exceeded. Please try again later.' },
      {
        status: 429,
        headers: createRateLimitHeaders(rateLimitResult),
      }
    );
  }

  try {
    // 環境変数からBearer Tokenを取得
    const bearerToken = process.env.TWITTER_BEARER_TOKEN;

    if (!bearerToken) {
      return NextResponse.json(
        { error: 'Twitter API Bearer Tokenが設定されていません' },
        { status: 500, headers: createRateLimitHeaders(rateLimitResult) }
      );
    }

    // クエリパラメータを取得
    const searchParams = request.nextUrl.searchParams;
    const queryParam = searchParams.get('query');
    const maxResultsParam = searchParams.get('max_results');

    if (!queryParam) {
      return NextResponse.json(
        { error: 'クエリパラメータが必要です' },
        { status: 400, headers: createRateLimitHeaders(rateLimitResult) }
      );
    }

    // Validate and sanitize query
    if (!isValidTwitterQuery(queryParam)) {
      return NextResponse.json(
        { error: 'クエリが無効です（最大512文字）' },
        { status: 400, headers: createRateLimitHeaders(rateLimitResult) }
      );
    }

    const query = sanitizeTwitterQuery(queryParam);
    // Validate max_results: Twitter API allows 10-100
    const maxResults = parseNumericParam(maxResultsParam, 100, 10, 100).toString();

    // Twitter APIにリクエスト
    const twitterUrl = new URL(`${TWITTER_API_BASE}/tweets/search/recent`);
    twitterUrl.searchParams.set('query', query);
    twitterUrl.searchParams.set('max_results', maxResults);
    twitterUrl.searchParams.set('tweet.fields', 'created_at,public_metrics,author_id');
    twitterUrl.searchParams.set('user.fields', 'username');
    twitterUrl.searchParams.set('expansions', 'author_id');

    const response = await fetch(twitterUrl.toString(), {
      headers: {
        'Authorization': `Bearer ${bearerToken}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('Twitter API Error:', errorData);

      return NextResponse.json(
        {
          error: 'Twitter APIリクエストに失敗しました',
        },
        { status: response.status, headers: createRateLimitHeaders(rateLimitResult) }
      );
    }

    const data = await response.json();

    return NextResponse.json(data, { headers: createRateLimitHeaders(rateLimitResult) });
  } catch (error) {
    console.error('Twitter API Route Error:', error);

    return NextResponse.json(
      {
        error: 'サーバーエラーが発生しました',
      },
      { status: 500 }
    );
  }
}
