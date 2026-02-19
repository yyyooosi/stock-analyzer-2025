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
import { searchTweetsViaApify, ApifyError } from '@/app/utils/apifyTwitter';

/**
 * GET /api/twitter/search?query=...&max_results=...
 *
 * Apify Tweet Scraper を使ってツイートを検索する。
 * 結果は既存の X API 互換フォーマットで返す。
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
  const queryParam = searchParams.get('query');
  const maxResultsParam = searchParams.get('max_results');

  if (!queryParam) {
    return NextResponse.json(
      { error: 'クエリパラメータが必要です' },
      { status: 400, headers: createRateLimitHeaders(rateLimitResult) }
    );
  }

  if (!isValidTwitterQuery(queryParam)) {
    return NextResponse.json(
      { error: 'クエリが無効です（最大512文字）' },
      { status: 400, headers: createRateLimitHeaders(rateLimitResult) }
    );
  }

  const query = sanitizeTwitterQuery(queryParam);
  const maxResults = parseNumericParam(maxResultsParam, 100, 10, 100);

  try {
    const result = await searchTweetsViaApify(query, maxResults);

    // X API 互換フォーマットに変換して返す
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
      _source: 'apify',
    };

    return NextResponse.json(compatibleData, {
      headers: createRateLimitHeaders(rateLimitResult),
    });
  } catch (error) {
    const isApifyError = error instanceof ApifyError;
    console.error(isApifyError ? 'Apify Error:' : 'Unexpected error:', error);

    return NextResponse.json(
      { error: 'ツイートの取得に失敗しました' },
      { status: 502, headers: createRateLimitHeaders(rateLimitResult) }
    );
  }
}
