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
  sentiment?: 'positive' | 'neutral' | 'negative';
  hasNegativeKeywords?: boolean;
}

export interface TwitterSearchResult {
  tweets: Tweet[];
  meta: {
    resultCount: number;
    newestId: string;
    oldestId: string;
  };
}

// APIエラークラス
export class TwitterAPIError extends Error {
  constructor(message: string, public statusCode?: number) {
    super(message);
    this.name = 'TwitterAPIError';
  }
}

// ネガティブキーワードリスト（地雷検出用）
const NEGATIVE_KEYWORDS = [
  'fraud',
  'scam',
  'lawsuit',
  'investigation',
  'SEC investigation',
  'accounting issue',
  'accounting fraud',
  'insider trading',
  'bankruptcy',
  'default',
  'リーク',
  '詐欺',
  '訴訟',
  '不正会計',
  '破綻',
  'plunge',
  'crash',
  '暴落',
  '急落',
];

// ポジティブキーワードリスト
const POSITIVE_KEYWORDS = [
  'breakthrough',
  'innovation',
  'growth',
  'bullish',
  'upgrade',
  'beat estimates',
  'strong earnings',
  'undervalued',
  'turnaround',
  'deep value',
  '成長',
  '革新',
  '好調',
  '上昇',
  '割安',
];

// ネガティブキーワードが含まれているかチェック
export function hasNegativeKeywords(text: string): boolean {
  const lowerText = text.toLowerCase();
  return NEGATIVE_KEYWORDS.some((keyword) => lowerText.includes(keyword.toLowerCase()));
}

// シンプルな感情分析（キーワードベース）
export function analyzeSentiment(text: string): 'positive' | 'neutral' | 'negative' {
  const lowerText = text.toLowerCase();

  let positiveCount = 0;
  let negativeCount = 0;

  // ポジティブキーワードのカウント
  POSITIVE_KEYWORDS.forEach((keyword) => {
    if (lowerText.includes(keyword.toLowerCase())) {
      positiveCount++;
    }
  });

  // ネガティブキーワードのカウント
  NEGATIVE_KEYWORDS.forEach((keyword) => {
    if (lowerText.includes(keyword.toLowerCase())) {
      negativeCount++;
    }
  });

  // 感情スコアの計算
  if (negativeCount > positiveCount) {
    return 'negative';
  } else if (positiveCount > negativeCount) {
    return 'positive';
  } else {
    return 'neutral';
  }
}

/**
 * 「暴落」キーワードで投稿を検索（日本語・英語両対応）
 * Next.js API Routeを経由してTwitter APIを呼び出す（CORS回避）
 * @param symbol 株式シンボル（オプション）
 * @param maxResults 取得する最大ツイート数（デフォルト: 100）
 */
export async function searchCrashTweets(
  symbol?: string,
  maxResults: number = 100
): Promise<TwitterSearchResult> {
  try {
    // 検索クエリの構築
    let query = '(暴落 OR crash OR plunge OR plummet)';

    // シンボルが指定されている場合は追加
    // 注意: Free tierでは cashtag ($AAPL) 演算子が使えないため、通常の文字列検索のみ
    if (symbol) {
      query += ` ${symbol}`;
    }

    // リツイートを除外し、日本語または英語のツイートのみ
    query += ' -is:retweet (lang:ja OR lang:en)';

    // Next.js API Routeを経由してリクエスト
    const params = new URLSearchParams({
      query: query,
      max_results: Math.min(maxResults, 100).toString()
    });

    const url = `/api/twitter/search?${params.toString()}`;

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new TwitterAPIError(
        `Twitter API Error: ${response.status} - ${errorData.error || errorData.message || 'Unknown error'}`,
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
      `Twitter APIリクエストエラー: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

/**
 * ティッカーシンボルに関する投稿を検索（感情分析付き）
 * @param symbol 株式シンボル（必須）
 * @param maxResults 取得する最大ツイート数（デフォルト: 100）
 */
export async function searchTickerMentions(
  symbol: string,
  maxResults: number = 100
): Promise<TwitterSearchResult> {
  try {
    // StockTwits を使用（symbol パラメータ経由）
    // フォールバック: TWITTER_BEARER_TOKEN があれば X API を使用
    const params = new URLSearchParams({
      symbol: symbol.trim().toUpperCase(),
      max_results: Math.min(maxResults, 100).toString(),
    });

    const url = `/api/twitter/search?${params.toString()}`;

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new TwitterAPIError(
        `Twitter API Error: ${response.status} - ${errorData.error || errorData.message || 'Unknown error'}`,
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

      // ツイートデータの整形（感情分析付き）
      data.data.forEach((tweet: any) => {
        const tweetText = tweet.text;
        tweets.push({
          id: tweet.id,
          text: tweetText,
          authorId: tweet.author_id,
          authorUsername: usersMap[tweet.author_id]?.username || 'unknown',
          createdAt: tweet.created_at,
          publicMetrics: {
            retweetCount: tweet.public_metrics?.retweet_count || 0,
            replyCount: tweet.public_metrics?.reply_count || 0,
            likeCount: tweet.public_metrics?.like_count || 0,
            quoteCount: tweet.public_metrics?.quote_count || 0,
          },
          sentiment: analyzeSentiment(tweetText),
          hasNegativeKeywords: hasNegativeKeywords(tweetText),
        });
      });
    }

    return {
      tweets,
      meta: {
        resultCount: data.meta?.result_count || 0,
        newestId: data.meta?.newest_id || '',
        oldestId: data.meta?.oldest_id || '',
      },
    };
  } catch (error) {
    if (error instanceof TwitterAPIError) {
      throw error;
    }
    throw new TwitterAPIError(
      `Twitter APIリクエストエラー: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

// =============================================================
// バッチ処理用: サーバーサイドから StockTwits 経由でツイートを直接取得
// =============================================================

export interface SentimentAggregation {
  tweetCount: number;
  positiveCount: number;
  neutralCount: number;
  negativeCount: number;
  negativeKeywordCount: number;
  sentimentScore: number; // -100 ~ +100
  sampleTweets: { text: string; sentiment: string; createdAt: string }[];
}

/**
 * StockTwits 経由でティッカーメンション検索（バッチ処理用サーバーサイド関数）
 * クライアント用の searchTickerMentions は /api/twitter/search を経由するが、
 * バッチ処理はサーバー内で完結させるためここから直接 StockTwits を呼ぶ。
 * 認証不要・完全無料（APIキー不要）。
 */
export async function searchTickerMentionsDirect(
  symbol: string,
  maxResults: number = 20
): Promise<Tweet[]> {
  const { getStockTwitsStream } = await import('./stockTwitsAPI');

  const result = await getStockTwitsStream(symbol.trim().toUpperCase());
  return result.tweets.slice(0, Math.min(maxResults, 30));
}

/**
 * ツイート配列からセンチメントを集計する
 */
export function aggregateSentiment(tweets: Tweet[]): SentimentAggregation {
  let positiveCount = 0;
  let neutralCount = 0;
  let negativeCount = 0;
  let negativeKeywordCount = 0;

  for (const tweet of tweets) {
    const sentiment = tweet.sentiment || analyzeSentiment(tweet.text);
    if (sentiment === 'positive') positiveCount++;
    else if (sentiment === 'negative') negativeCount++;
    else neutralCount++;

    if (tweet.hasNegativeKeywords ?? hasNegativeKeywords(tweet.text)) {
      negativeKeywordCount++;
    }
  }

  const tweetCount = tweets.length;
  // スコア計算: -100(全てネガティブ) ~ +100(全てポジティブ)
  const sentimentScore =
    tweetCount > 0
      ? Math.round(((positiveCount - negativeCount) / tweetCount) * 100)
      : 0;

  // エンゲージメントが高い順に上位5件を保存
  const sampleTweets = [...tweets]
    .sort((a, b) => {
      const engA = a.publicMetrics.likeCount + a.publicMetrics.retweetCount;
      const engB = b.publicMetrics.likeCount + b.publicMetrics.retweetCount;
      return engB - engA;
    })
    .slice(0, 5)
    .map((t) => ({
      text: t.text,
      sentiment: t.sentiment || analyzeSentiment(t.text),
      createdAt: t.createdAt,
    }));

  return {
    tweetCount,
    positiveCount,
    neutralCount,
    negativeCount,
    negativeKeywordCount,
    sentimentScore,
    sampleTweets,
  };
}

/**
 * デモモード用のサンプルツイートを生成
 */
export function generateSampleTweets(symbol?: string): TwitterSearchResult {
  const sampleTexts = [
    `${symbol || '米国株'}が暴落！今日の下落率は驚異的。投資家パニック状態。`,
    `Market crash today! ${symbol || 'Stocks'} plummeting. Major concerns about the economy.`,
    `${symbol || '株価'}急落中。損失が拡大している。売り圧力が強い。`,
    `This is terrible. ${symbol || 'Stock'} price is dropping fast. Huge selloff happening now.`,
    `危険な状況。${symbol || '市場'}全体が下落トレンド。暴落の兆候が見られる。`,
    `Fear and panic in the market. ${symbol || 'Stocks'} crashing hard. Risk levels are high.`,
    `最悪の展開。${symbol || '株'}がさらに下落。投資家は損切りを検討すべき。`,
    `Warning: Major decline in ${symbol || 'stock'} prices. Market weakness evident.`,
    `${symbol || '銘柄'}のチャートが崩壊中。ボリュームも増加。売られすぎ状態。`,
    `Bearish sentiment everywhere. ${symbol || 'Market'} looks weak. Expecting more downside.`,
  ];

  const usernames = [
    'investor_demo1',
    'trader_demo2',
    'market_watcher_demo',
    'financial_news_demo',
    'analyst_demo',
    'risk_monitor_demo',
    'portfolio_manager_demo',
    'market_alert_demo',
    'chart_analyst_demo',
    'bear_trader_demo',
  ];

  const sampleTweets: Tweet[] = sampleTexts.map((text, index) => ({
    id: (index + 1).toString(),
    text,
    authorId: `demo${index + 1}`,
    authorUsername: usernames[index],
    createdAt: new Date(Date.now() - 1000 * 60 * (5 + index * 5)).toISOString(),
    publicMetrics: {
      retweetCount: Math.floor(Math.random() * 150) + 50,
      replyCount: Math.floor(Math.random() * 70) + 15,
      likeCount: Math.floor(Math.random() * 300) + 100,
      quoteCount: Math.floor(Math.random() * 25) + 5,
    },
    sentiment: analyzeSentiment(text),
    hasNegativeKeywords: hasNegativeKeywords(text),
  }));

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
  // デモモードの場合
  if (!useRealData) {
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
