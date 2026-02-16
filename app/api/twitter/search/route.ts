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

// Twitter API v2のエンドポイント
const TWITTER_API_BASE = 'https://api.twitter.com/2';

/**
 * データソース優先順位:
 *   1. 公式 X API (TWITTER_BEARER_TOKEN が設定されている場合)
 *   2. Apify スクレイパー (APIFY_API_TOKEN が設定されている場合)
 *   3. 両方未設定 → 500 エラー
 *
 * X API Free Tier の制限 (月10回・15分に1回) を Apify でカバーする。
 */
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

  // クエリパラメータを取得・バリデーション
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

  // ── 1. 公式 X API ────────────────────────────────────────
  const bearerToken = process.env.TWITTER_BEARER_TOKEN;

  if (bearerToken) {
    try {
      const twitterUrl = new URL(`${TWITTER_API_BASE}/tweets/search/recent`);
      twitterUrl.searchParams.set('query', query);
      twitterUrl.searchParams.set('max_results', maxResults.toString());
      twitterUrl.searchParams.set('tweet.fields', 'created_at,public_metrics,author_id');
      twitterUrl.searchParams.set('user.fields', 'username');
      twitterUrl.searchParams.set('expansions', 'author_id');

      const response = await fetch(twitterUrl.toString(), {
        headers: {
          Authorization: `Bearer ${bearerToken}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        return NextResponse.json(
          { ...data, _source: 'twitter_api' },
          { headers: createRateLimitHeaders(rateLimitResult) }
        );
      }

      // 429 (レート制限超過) または 403 (月上限) の場合は Apify にフォールバック
      const errorData = await response.json().catch(() => ({}));
      const shouldFallback = response.status === 429 || response.status === 403;

      if (!shouldFallback) {
        console.error('Twitter API Error (non-recoverable):', response.status, errorData);
        return NextResponse.json(
          { error: 'Twitter APIリクエストに失敗しました' },
          { status: response.status, headers: createRateLimitHeaders(rateLimitResult) }
        );
      }

      console.warn(
        `Twitter API rate limit hit (${response.status}). Falling back to Apify...`
      );
    } catch (error) {
      console.warn('Twitter API fetch error, falling back to Apify:', error);
    }
  }

  // ── 2. Apify フォールバック ──────────────────────────────
  const apifyToken = process.env.APIFY_API_TOKEN;

  if (apifyToken) {
    try {
      console.log('Apify でツイートを取得中:', query);
      const result = await searchTweetsViaApify(query, maxResults);

      // Apify 結果を X API 互換フォーマットに変換して返す
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
      console.error(
        isApifyError ? 'Apify Error:' : 'Apify unexpected error:',
        error
      );

      return NextResponse.json(
        { error: 'Apify でのツイート取得に失敗しました' },
        { status: 502, headers: createRateLimitHeaders(rateLimitResult) }
      );
    }
  }

  // ── 3. どちらも未設定 ────────────────────────────────────
  console.error('TWITTER_BEARER_TOKEN も APIFY_API_TOKEN も設定されていません');
  return NextResponse.json(
    {
      error:
        'Twitter API または Apify API の認証情報が設定されていません。' +
        'TWITTER_BEARER_TOKEN または APIFY_API_TOKEN を環境変数に設定してください。',
    },
    { status: 500, headers: createRateLimitHeaders(rateLimitResult) }
  );
}
