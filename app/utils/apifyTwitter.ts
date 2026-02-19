/**
 * Apify X (Twitter) スクレイパー統合ユーティリティ
 *
 * 概要:
 *   公式 X API (Free Tier) の制限 → 15分に1回・月10件 を回避するため、
 *   Apify の Tweet Scraper を代替ソースとして利用する。
 *
 * 使用 Actor:
 *   apidojo/tweet-scraper (Tweet Scraper V2)
 *   - $0.50 / 1,000 tweets（使用量課金）
 *   - Free Tier: 月 $5 クレジット → 約 10,000 ツイート分
 *
 * 公式 X API vs Apify 比較:
 *   | 項目              | X API Free Tier        | Apify Free Tier            |
 *   |------------------|------------------------|----------------------------|
 *   | リクエスト制限    | 月10回・15分に1回       | 実質なし（クレジット次第）   |
 *   | 取得件数          | 10件/リクエスト         | 最大100,000件以上            |
 *   | コスト            | 無料                   | $5/月（無料枠）              |
 *   | 承認プロセス      | 必要（数週間）          | 即日利用可能                 |
 *   | 履歴データ        | 直近7日のみ            | 深い履歴データにアクセス可能 |
 *   | ToS準拠           | 完全準拠               | 法的にはグレーゾーン         |
 */

import { Tweet, TwitterSearchResult, analyzeSentiment, hasNegativeKeywords } from './twitterAPI';

// ============================================================
// 定数
// ============================================================

const APIFY_API_BASE = 'https://api.apify.com/v2';

/**
 * Tweet Scraper V2 (apidojo)
 * - 最も安定している公式推奨のツイートスクレイパー
 * - $0.50 / 1,000 tweets
 */
const TWEET_SCRAPER_ACTOR_ID = 'apidojo~tweet-scraper';

/**
 * 同期実行のタイムアウト (秒)
 * Apify の run-sync は最大 300 秒まで対応
 * 株価分析では 60 秒以内に結果が欲しいため 90 秒を設定
 */
const SYNC_TIMEOUT_SECONDS = 90;

/** Actor に割り当てるメモリ (MB) - 最小は 128MB */
const ACTOR_MEMORY_MB = 256;

// ============================================================
// 型定義
// ============================================================

/** Apify の Tweet Scraper V2 が返すツイートの生データ */
interface ApifyRawTweet {
  id?: string;
  type?: string;
  url?: string;
  twitterUrl?: string;
  text?: string;
  fullText?: string;
  retweetCount?: number;
  replyCount?: number;
  likeCount?: number;
  quoteCount?: number;
  viewCount?: number;
  bookmarkCount?: number;
  createdAt?: string;
  isRetweet?: boolean;
  isQuote?: boolean;
  lang?: string;
  author?: {
    id?: string;
    userName?: string;
    name?: string;
    isVerified?: boolean;
    isBlueVerified?: boolean;
  };
}

/** Apify Actor 実行時の入力パラメータ */
interface ApifyActorInput {
  searchTerms: string[];
  maxItems: number;
  queryType: 'Latest' | 'Top' | 'People' | 'Photos' | 'Videos';
  lang?: string;
}

/** Apify API のエラー */
export class ApifyError extends Error {
  constructor(
    message: string,
    public statusCode?: number,
    public apifyCode?: string
  ) {
    super(message);
    this.name = 'ApifyError';
  }
}

// ============================================================
// ヘルパー関数
// ============================================================

/**
 * Apify の生ツイートデータを共通の Tweet インターフェースに変換する
 */
function mapApifyTweetToTweet(raw: ApifyRawTweet): Tweet | null {
  // 必須フィールドのチェック
  if (!raw.id || !raw.text) {
    return null;
  }

  // リツイートはデフォルトで除外（感情分析の重複を防ぐ）
  if (raw.isRetweet) {
    return null;
  }

  const tweetText = raw.fullText || raw.text;

  return {
    id: raw.id,
    text: tweetText,
    authorId: raw.author?.id || 'unknown',
    authorUsername: raw.author?.userName || 'unknown',
    createdAt: raw.createdAt || new Date().toISOString(),
    publicMetrics: {
      retweetCount: raw.retweetCount || 0,
      replyCount: raw.replyCount || 0,
      likeCount: raw.likeCount || 0,
      quoteCount: raw.quoteCount || 0,
    },
    sentiment: analyzeSentiment(tweetText),
    hasNegativeKeywords: hasNegativeKeywords(tweetText),
  };
}

/**
 * Apify の同期実行 URL を構築する
 * run-sync-get-dataset-items: Actor を実行して結果を直接返す（ポーリング不要）
 */
function buildApifySyncUrl(apiToken: string): string {
  const params = new URLSearchParams({
    token: apiToken,
    timeout: SYNC_TIMEOUT_SECONDS.toString(),
    memory: ACTOR_MEMORY_MB.toString(),
    outputRecordKey: 'OUTPUT',
  });

  return `${APIFY_API_BASE}/acts/${TWEET_SCRAPER_ACTOR_ID}/run-sync-get-dataset-items?${params.toString()}`;
}

// ============================================================
// メイン関数
// ============================================================

/**
 * Apify Tweet Scraper を使ってツイートを検索する
 *
 * @param query 検索クエリ文字列（X の検索構文に準拠）
 * @param maxResults 取得する最大ツイート数（デフォルト: 20）
 * @returns 標準形式の TwitterSearchResult
 *
 * @example
 * // 暴落関連のツイートを検索
 * const result = await searchTweetsViaApify('AAPL crash plunge', 20);
 *
 * @throws {ApifyError} API トークン未設定・HTTP エラー・タイムアウト時
 */
export async function searchTweetsViaApify(
  query: string,
  maxResults: number = 20
): Promise<TwitterSearchResult> {
  const apiToken = process.env.APIFY_API_TOKEN;

  if (!apiToken) {
    throw new ApifyError('APIFY_API_TOKEN 環境変数が設定されていません');
  }

  // Apify に送信する Actor 入力
  const actorInput: ApifyActorInput = {
    searchTerms: [query],
    maxItems: Math.min(maxResults, 100), // 無料枠を考慮して上限を設ける
    queryType: 'Latest',                 // 最新順で取得
  };

  const url = buildApifySyncUrl(apiToken);

  let response: Response;
  try {
    response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(actorInput),
      // Node.js の fetch はタイムアウトを signal で設定
      signal: AbortSignal.timeout((SYNC_TIMEOUT_SECONDS + 10) * 1000),
    });
  } catch (error) {
    if (error instanceof Error && error.name === 'TimeoutError') {
      throw new ApifyError(
        `Apify リクエストがタイムアウトしました（${SYNC_TIMEOUT_SECONDS}秒）`
      );
    }
    throw new ApifyError(
      `Apify への接続に失敗しました: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }

  if (!response.ok) {
    let errorBody: Record<string, unknown> = {};
    try {
      errorBody = await response.json();
    } catch {
      // JSON 解析失敗は無視
    }

    throw new ApifyError(
      `Apify API エラー: ${response.status} - ${JSON.stringify(errorBody)}`,
      response.status,
      (errorBody as { error?: { type?: string } })?.error?.type
    );
  }

  const rawTweets: ApifyRawTweet[] = await response.json();

  // 生データを共通形式に変換（null を除外）
  const tweets: Tweet[] = rawTweets
    .map(mapApifyTweetToTweet)
    .filter((t): t is Tweet => t !== null);

  return {
    tweets,
    meta: {
      resultCount: tweets.length,
      newestId: tweets[0]?.id || '',
      oldestId: tweets[tweets.length - 1]?.id || '',
    },
  };
}

/**
 * 暴落関連ツイートを Apify 経由で検索する（株式分析向けラッパー）
 *
 * @param symbol 株式シンボル（例: 'AAPL', 'TSLA'）
 * @param maxResults 取得する最大ツイート数
 */
export async function searchCrashTweetsViaApify(
  symbol?: string,
  maxResults: number = 20
): Promise<TwitterSearchResult> {
  // 暴落関連キーワードのクエリ（日英両対応）
  let query = '(暴落 OR crash OR plunge OR plummet OR 急落 OR bearish)';

  if (symbol) {
    query += ` ${symbol}`;
  }

  return searchTweetsViaApify(query, maxResults);
}

/**
 * Apify の疎通確認（API トークンが有効かチェック）
 *
 * @returns { valid: boolean, username?: string, plan?: string }
 */
export async function checkApifyConnection(): Promise<{
  valid: boolean;
  username?: string;
  plan?: string;
  monthlyUsage?: number;
  error?: string;
}> {
  const apiToken = process.env.APIFY_API_TOKEN;

  if (!apiToken) {
    return { valid: false, error: 'APIFY_API_TOKEN が設定されていません' };
  }

  try {
    const response = await fetch(
      `${APIFY_API_BASE}/users/me?token=${apiToken}`,
      { method: 'GET' }
    );

    if (!response.ok) {
      return {
        valid: false,
        error: `認証失敗 (HTTP ${response.status})`,
      };
    }

    const data = await response.json();
    const userData = data?.data;

    return {
      valid: true,
      username: userData?.username,
      plan: userData?.plan?.id,
      monthlyUsage: userData?.monthlyUsage?.totalCostUsd,
    };
  } catch (error) {
    return {
      valid: false,
      error: `接続エラー: ${error instanceof Error ? error.message : 'Unknown'}`,
    };
  }
}
