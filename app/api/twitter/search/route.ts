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
import { getStockTwitsStream, StockTwitsError } from '@/app/utils/stockTwitsAPI';

// X (Twitter) API v2 のエンドポイント（オプションフォールバック用）
const TWITTER_API_BASE = 'https://api.twitter.com/2';

/**
 * GET /api/twitter/search?symbol=AAPL
 *    /api/twitter/search?query=...&max_results=...  (X API フォールバック)
 *
 * - symbol パラメータがある場合: StockTwits を使用（認証不要・無料）
 * - query のみの場合: X API v2 にフォールバック（TWITTER_BEARER_TOKEN が必要）
 */
export async function GET(request: NextRequest) {
  const clientId = getClientIdentifier(request);
  const rateLimitResult = checkRateLimit(clientId, RateLimitConfigs.twitter);

  if (!rateLimitResult.allowed) {
    return NextResponse.json(
      { error: 'Rate limit exceeded. Please try again later.' },
      { status: 429, headers: createRateLimitHeaders(rateLimitResult) }
    );
  }

  const searchParams = request.nextUrl.searchParams;
  const symbolParam = searchParams.get('symbol');
  const queryParam = searchParams.get('query');
  const maxResultsParam = searchParams.get('max_results');

  // ── StockTwits パス（symbol パラメータが指定された場合）─────────────
  if (symbolParam) {
    const symbol = symbolParam.trim().toUpperCase();

    try {
      const result = await getStockTwitsStream(symbol);

      const compatibleData = {
        data: result.tweets.map((t) => ({
          id: t.id,
          text: t.text,
          author_id: t.authorId,
          created_at: t.createdAt,
          public_metrics: {
            retweet_count: t.publicMetrics.retweetCount,
            reply_count: t.publicMetrics.replyCount,
            like_count: t.publicMetrics.likeCount,
            quote_count: t.publicMetrics.quoteCount,
          },
          sentiment: t.sentiment,
        })),
        includes: {
          users: result.tweets.map((t) => ({
            id: t.authorId,
            username: t.authorUsername,
          })),
        },
        meta: {
          result_count: result.meta.resultCount,
          newest_id: result.meta.newestId,
          oldest_id: result.meta.oldestId,
        },
        _source: 'stocktwits',
      };

      return NextResponse.json(compatibleData, {
        headers: createRateLimitHeaders(rateLimitResult),
      });
    } catch (error) {
      const isStockTwitsError = error instanceof StockTwitsError;
      console.error(isStockTwitsError ? 'StockTwits Error:' : 'Unexpected error:', error);

      return NextResponse.json(
        { error: 'StockTwits からのデータ取得に失敗しました' },
        { status: 502, headers: createRateLimitHeaders(rateLimitResult) }
      );
    }
  }

  // ── X API フォールバックパス（query パラメータが指定された場合）──────
  if (!queryParam) {
    return NextResponse.json(
      { error: 'symbol または query パラメータが必要です' },
      { status: 400, headers: createRateLimitHeaders(rateLimitResult) }
    );
  }

  const bearerToken = process.env.TWITTER_BEARER_TOKEN;
  if (!bearerToken) {
    return NextResponse.json(
      { error: 'TWITTER_BEARER_TOKEN が設定されていません（symbol パラメータを使用してください）' },
      { status: 503, headers: createRateLimitHeaders(rateLimitResult) }
    );
  }

  if (!isValidTwitterQuery(queryParam)) {
    return NextResponse.json(
      { error: 'クエリが無効です（最大512文字）' },
      { status: 400, headers: createRateLimitHeaders(rateLimitResult) }
    );
  }

  const query = sanitizeTwitterQuery(queryParam);
  const maxResults = parseNumericParam(maxResultsParam, 100, 10, 100).toString();

  try {
    const twitterUrl = new URL(`${TWITTER_API_BASE}/tweets/search/recent`);
    twitterUrl.searchParams.set('query', query);
    twitterUrl.searchParams.set('max_results', maxResults);
    twitterUrl.searchParams.set('tweet.fields', 'created_at,public_metrics,author_id');
    twitterUrl.searchParams.set('user.fields', 'username');
    twitterUrl.searchParams.set('expansions', 'author_id');

    const response = await fetch(twitterUrl.toString(), {
      headers: {
        Authorization: `Bearer ${bearerToken}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('X API Error:', errorData);
      return NextResponse.json(
        { error: 'X API リクエストに失敗しました' },
        { status: response.status, headers: createRateLimitHeaders(rateLimitResult) }
      );
    }

    const data = await response.json();
    return NextResponse.json(
      { ...data, _source: 'x-api' },
      { headers: createRateLimitHeaders(rateLimitResult) }
    );
  } catch (error) {
    console.error('X API Route Error:', error);
    return NextResponse.json(
      { error: 'サーバーエラーが発生しました' },
      { status: 500 }
    );
  }
}
