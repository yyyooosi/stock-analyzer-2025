/**
 * StockTwits API 統合ユーティリティ
 *
 * 概要:
 *   認証不要・完全無料の株式特化型ソーシャルプラットフォーム。
 *   ティッカーシンボル別に最新30件の投稿を取得できる。
 *
 * エンドポイント:
 *   GET https://api.stocktwits.com/api/2/streams/symbol/{SYMBOL}.json
 *
 * 制限:
 *   - 1回のレスポンスで最大 30 件
 *   - レート制限: ~400 リクエスト/時間（公式未公開・コミュニティ報告値）
 *     ※ 公式ドキュメントにレート制限の明記なし。429 が返ったら退避。
 *   - 認証不要（API キー不要）
 *
 * コスト: 完全無料
 */

import { Tweet, TwitterSearchResult, analyzeSentiment, hasNegativeKeywords } from './twitterAPI';

// ============================================================
// 定数
// ============================================================

const STOCKTWITS_API_BASE = 'https://api.stocktwits.com/api/2';

// ============================================================
// 型定義
// ============================================================

interface StockTwitsUser {
  id: number;
  username: string;
  name: string;
}

interface StockTwitsMessage {
  id: number;
  body: string;
  created_at: string;
  user: StockTwitsUser;
  entities: {
    sentiment?: {
      basic: 'Bullish' | 'Bearish';
    } | null;
  };
  likes?: {
    total: number;
  };
  reshares?: {
    reshared_count: number;
  };
}

interface StockTwitsStreamResponse {
  response: {
    status: number;
  };
  messages?: StockTwitsMessage[];
  errors?: Array<{ message: string }>;
}

/** StockTwits API のエラー */
export class StockTwitsError extends Error {
  constructor(
    message: string,
    public statusCode?: number
  ) {
    super(message);
    this.name = 'StockTwitsError';
  }
}

// ============================================================
// ヘルパー
// ============================================================

/**
 * StockTwits のメッセージを共通 Tweet 形式に変換する
 */
function mapStockTwitsMessageToTweet(msg: StockTwitsMessage): Tweet {
  const text = msg.body;

  // StockTwits の Bullish/Bearish を共通 sentiment に変換
  // ユーザーが明示的にラベルを付けた場合はそれを優先、なければキーワード分析
  let sentiment: 'positive' | 'neutral' | 'negative';
  if (msg.entities?.sentiment?.basic === 'Bullish') {
    sentiment = 'positive';
  } else if (msg.entities?.sentiment?.basic === 'Bearish') {
    sentiment = 'negative';
  } else {
    sentiment = analyzeSentiment(text);
  }

  return {
    id: msg.id.toString(),
    text,
    authorId: msg.user.id.toString(),
    authorUsername: msg.user.username,
    createdAt: msg.created_at,
    publicMetrics: {
      retweetCount: msg.reshares?.reshared_count ?? 0,
      replyCount: 0,
      likeCount: msg.likes?.total ?? 0,
      quoteCount: 0,
    },
    sentiment,
    hasNegativeKeywords: hasNegativeKeywords(text),
  };
}

// ============================================================
// メイン関数
// ============================================================

/**
 * StockTwits からティッカーシンボルの最新投稿を取得する
 *
 * @param symbol 株式シンボル（例: 'AAPL', 'TSLA'）
 * @returns 標準形式の TwitterSearchResult（最大 30 件）
 *
 * @throws {StockTwitsError} HTTP エラー時
 */
export async function getStockTwitsStream(symbol: string): Promise<TwitterSearchResult> {
  const url = `${STOCKTWITS_API_BASE}/streams/symbol/${encodeURIComponent(symbol)}.json`;

  let response: Response;
  try {
    response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; StockAnalyzer/1.0)',
      },
    });
  } catch (error) {
    throw new StockTwitsError(
      `StockTwits への接続に失敗しました: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }

  if (!response.ok) {
    let errorBody: StockTwitsStreamResponse | null = null;
    try {
      errorBody = await response.json();
    } catch {
      // JSON 解析失敗は無視
    }
    const errorMsg = errorBody?.errors?.[0]?.message ?? '';
    throw new StockTwitsError(
      `StockTwits API エラー: ${response.status}${errorMsg ? ` - ${errorMsg}` : ''}`,
      response.status
    );
  }

  const data: StockTwitsStreamResponse = await response.json();

  if (!data.messages || data.messages.length === 0) {
    return {
      tweets: [],
      meta: { resultCount: 0, newestId: '', oldestId: '' },
    };
  }

  const tweets = data.messages.map(mapStockTwitsMessageToTweet);

  return {
    tweets,
    meta: {
      resultCount: tweets.length,
      newestId: tweets[0]?.id ?? '',
      oldestId: tweets[tweets.length - 1]?.id ?? '',
    },
  };
}
