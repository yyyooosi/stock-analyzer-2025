// X (Twitter) API連携ユーティリティ
// 「暴落」キーワードを含む投稿を検索

export interface Tweet {
  id: string;
  text: string;
  authorId: string;
  authorUsername: string;
  createdAt: string;
  publicMetrics: {
    retweetCount: number;
    replyCount: number;
    likeCount: number;
    quoteCount: number;
  };
}

export interface TwitterSearchResult {
  tweets: Tweet[];
  meta: {
    resultCount: number;
    newestId: string;
    oldestId: string;
  };
}

// X API v2のエンドポイント
const TWITTER_API_BASE = 'https://api.twitter.com/2';

// APIエラークラス
export class TwitterAPIError extends Error {
  constructor(message: string, public statusCode?: number) {
    super(message);
    this.name = 'TwitterAPIError';
  }
}

/**
 * X APIのBearer Tokenを取得
 */
function getTwitterBearerToken(): string {
  const token = process.env.NEXT_PUBLIC_TWITTER_BEARER_TOKEN;
  if (!token) {
    throw new TwitterAPIError('X API Bearer Tokenが設定されていません。環境変数を確認してください。');
  }
  return token;
}

/**
 * 「暴落」キーワードで投稿を検索（日本語・英語両対応）
 * @param symbol 株式シンボル（オプション）
 * @param maxResults 取得する最大ツイート数（デフォルト: 100）
 */
export async function searchCrashTweets(
  symbol?: string,
  maxResults: number = 100
): Promise<TwitterSearchResult> {
  try {
    const bearerToken = getTwitterBearerToken();

    // 検索クエリの構築
    // 「暴落」または "crash" を含む投稿を検索
    let query = '(暴落 OR crash OR plunge OR plummet)';

    // シンボルが指定されている場合は追加
    if (symbol) {
      query += ` (${symbol} OR $${symbol})`;
    }

    // リツイートを除外し、日本語または英語のツイートのみ
    query += ' -is:retweet (lang:ja OR lang:en)';

    // URLエンコード
    const encodedQuery = encodeURIComponent(query);

    // APIリクエストのパラメータ
    const params = new URLSearchParams({
      query: encodedQuery,
      max_results: Math.min(maxResults, 100).toString(), // APIの制限: 最大100
      'tweet.fields': 'created_at,public_metrics,author_id',
      'user.fields': 'username',
      expansions: 'author_id'
    });

    const url = `${TWITTER_API_BASE}/tweets/search/recent?${params.toString()}`;

    // APIリクエスト
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${bearerToken}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new TwitterAPIError(
        `X API Error: ${response.status} ${response.statusText} - ${JSON.stringify(errorData)}`,
        response.status
      );
    }

    const data = await response.json();

    // レスポンスデータの変換
    const tweets: Tweet[] = [];

    if (data.data && Array.isArray(data.data)) {
      // ユーザー情報のマッピング
      const usersMap: { [id: string]: { username: string } } = {};
      if (data.includes?.users) {
        data.includes.users.forEach((user: any) => {
          usersMap[user.id] = { username: user.username };
        });
      }

      // ツイートデータの整形
      data.data.forEach((tweet: any) => {
        tweets.push({
          id: tweet.id,
          text: tweet.text,
          authorId: tweet.author_id,
          authorUsername: usersMap[tweet.author_id]?.username || 'unknown',
          createdAt: tweet.created_at,
          publicMetrics: {
            retweetCount: tweet.public_metrics?.retweet_count || 0,
            replyCount: tweet.public_metrics?.reply_count || 0,
            likeCount: tweet.public_metrics?.like_count || 0,
            quoteCount: tweet.public_metrics?.quote_count || 0
          }
        });
      });
    }

    return {
      tweets,
      meta: {
        resultCount: data.meta?.result_count || 0,
        newestId: data.meta?.newest_id || '',
        oldestId: data.meta?.oldest_id || ''
      }
    };

  } catch (error) {
    if (error instanceof TwitterAPIError) {
      throw error;
    }
    throw new TwitterAPIError(
      `X APIリクエストエラー: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

/**
 * デモモード用のサンプルツイートを生成
 */
export function generateSampleTweets(symbol?: string): TwitterSearchResult {
  const sampleTweets: Tweet[] = [
    {
      id: '1',
      text: `${symbol || '米国株'}が暴落！今日の下落率は驚異的。投資家パニック状態。`,
      authorId: 'demo1',
      authorUsername: 'investor_demo1',
      createdAt: new Date(Date.now() - 1000 * 60 * 5).toISOString(),
      publicMetrics: { retweetCount: 120, replyCount: 45, likeCount: 230, quoteCount: 15 }
    },
    {
      id: '2',
      text: `Market crash today! ${symbol || 'Stocks'} plummeting. Major concerns about the economy.`,
      authorId: 'demo2',
      authorUsername: 'trader_demo2',
      createdAt: new Date(Date.now() - 1000 * 60 * 10).toISOString(),
      publicMetrics: { retweetCount: 85, replyCount: 32, likeCount: 178, quoteCount: 8 }
    },
    {
      id: '3',
      text: `${symbol || '株価'}急落中。損失が拡大している。売り圧力が強い。`,
      authorId: 'demo3',
      authorUsername: 'market_watcher_demo',
      createdAt: new Date(Date.now() - 1000 * 60 * 15).toISOString(),
      publicMetrics: { retweetCount: 55, replyCount: 18, likeCount: 95, quoteCount: 5 }
    },
    {
      id: '4',
      text: `This is terrible. ${symbol || 'Stock'} price is dropping fast. Huge selloff happening now.`,
      authorId: 'demo4',
      authorUsername: 'financial_news_demo',
      createdAt: new Date(Date.now() - 1000 * 60 * 20).toISOString(),
      publicMetrics: { retweetCount: 145, replyCount: 67, likeCount: 312, quoteCount: 22 }
    },
    {
      id: '5',
      text: `危険な状況。${symbol || '市場'}全体が下落トレンド。暴落の兆候が見られる。`,
      authorId: 'demo5',
      authorUsername: 'analyst_demo',
      createdAt: new Date(Date.now() - 1000 * 60 * 25).toISOString(),
      publicMetrics: { retweetCount: 73, replyCount: 28, likeCount: 156, quoteCount: 11 }
    },
    {
      id: '6',
      text: `Fear and panic in the market. ${symbol || 'Stocks'} crashing hard. Risk levels are high.`,
      authorId: 'demo6',
      authorUsername: 'risk_monitor_demo',
      createdAt: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
      publicMetrics: { retweetCount: 98, replyCount: 41, likeCount: 203, quoteCount: 14 }
    },
    {
      id: '7',
      text: `最悪の展開。${symbol || '株'}がさらに下落。投資家は損切りを検討すべき。`,
      authorId: 'demo7',
      authorUsername: 'portfolio_manager_demo',
      createdAt: new Date(Date.now() - 1000 * 60 * 35).toISOString(),
      publicMetrics: { retweetCount: 62, replyCount: 25, likeCount: 134, quoteCount: 7 }
    },
    {
      id: '8',
      text: `Warning: Major decline in ${symbol || 'stock'} prices. Market weakness evident.`,
      authorId: 'demo8',
      authorUsername: 'market_alert_demo',
      createdAt: new Date(Date.now() - 1000 * 60 * 40).toISOString(),
      publicMetrics: { retweetCount: 110, replyCount: 52, likeCount: 245, quoteCount: 18 }
    },
    {
      id: '9',
      text: `${symbol || '銘柄'}のチャートが崩壊中。ボリュームも増加。売られすぎ状態。`,
      authorId: 'demo9',
      authorUsername: 'chart_analyst_demo',
      createdAt: new Date(Date.now() - 1000 * 60 * 45).toISOString(),
      publicMetrics: { retweetCount: 47, replyCount: 19, likeCount: 102, quoteCount: 6 }
    },
    {
      id: '10',
      text: `Bearish sentiment everywhere. ${symbol || 'Market'} looks weak. Expecting more downside.`,
      authorId: 'demo10',
      authorUsername: 'bear_trader_demo',
      createdAt: new Date(Date.now() - 1000 * 60 * 50).toISOString(),
      publicMetrics: { retweetCount: 81, replyCount: 34, likeCount: 167, quoteCount: 9 }
    }
  ];

  return {
    tweets: sampleTweets,
    meta: {
      resultCount: sampleTweets.length,
      newestId: sampleTweets[0].id,
      oldestId: sampleTweets[sampleTweets.length - 1].id
    }
  };
}

/**
 * 統合ツイート取得関数（実データ → デモデータ）
 */
export async function fetchCrashTweets(
  symbol?: string,
  useRealData: boolean = true,
  maxResults: number = 100
): Promise<TwitterSearchResult> {
  // デモモードまたはAPIキーがない場合
  if (!useRealData || !process.env.NEXT_PUBLIC_TWITTER_BEARER_TOKEN) {
    console.log('デモモードでサンプルツイートを使用中...');
    return generateSampleTweets(symbol);
  }

  try {
    console.log(`実際のツイートを検索中: ${symbol || '全般'}`);
    const result = await searchCrashTweets(symbol, maxResults);
    console.log(`${result.meta.resultCount}件のツイートを取得しました`);
    return result;
  } catch (error) {
    console.warn('ツイート取得に失敗、デモデータを使用:', error instanceof Error ? error.message : error);
    return generateSampleTweets(symbol);
  }
}
