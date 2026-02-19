import { sql } from '@vercel/postgres';
import { maskEmail } from './validation';

export interface WatchlistDbItem {
  id: number;
  user_email: string;
  symbol: string;
  added_at: string;
}

// テーブルの初期化（初回のみ実行）
export async function initializeDatabase() {
  try {
    await sql`
      CREATE TABLE IF NOT EXISTS watchlist (
        id SERIAL PRIMARY KEY,
        user_email TEXT NOT NULL,
        symbol TEXT NOT NULL,
        added_at TIMESTAMP NOT NULL DEFAULT NOW(),
        UNIQUE(user_email, symbol)
      )
    `;

    // インデックスを作成
    await sql`
      CREATE INDEX IF NOT EXISTS idx_user_email ON watchlist(user_email)
    `;

    console.log('データベースの初期化が完了しました');
  } catch (error) {
    console.error('データベース初期化エラー:', error);
    throw error;
  }
}

// ユーザーのウォッチリストを取得
export async function getUserWatchlist(userEmail: string): Promise<WatchlistDbItem[]> {
  try {
    const result = await sql`
      SELECT id, user_email, symbol, added_at
      FROM watchlist
      WHERE user_email = ${userEmail}
      ORDER BY added_at DESC
    `;
    // Log with masked email for security
    console.log(`[Database] getUserWatchlist for ${maskEmail(userEmail)}: ${result.rowCount} items`);
    return result.rows as WatchlistDbItem[];
  } catch (error) {
    console.error('[Database] ウォッチリスト取得エラー');
    throw error;
  }
}

// ウォッチリストに銘柄を追加
export async function addToWatchlistDb(userEmail: string, symbol: string): Promise<boolean> {
  try {
    await sql`
      INSERT INTO watchlist (user_email, symbol, added_at)
      VALUES (${userEmail}, ${symbol.toUpperCase()}, NOW())
    `;
    return true;
  } catch (error: any) {
    // UNIQUE制約違反の場合はfalseを返す
    if (error?.code === '23505') { // PostgreSQLのunique_violation
      return false;
    }
    console.error('ウォッチリスト追加エラー:', error);
    throw error;
  }
}

// ウォッチリストから銘柄を削除
export async function removeFromWatchlistDb(userEmail: string, symbol: string): Promise<boolean> {
  try {
    const result = await sql`
      DELETE FROM watchlist
      WHERE user_email = ${userEmail} AND symbol = ${symbol.toUpperCase()}
    `;
    return result.rowCount !== null && result.rowCount > 0;
  } catch (error) {
    console.error('ウォッチリスト削除エラー:', error);
    throw error;
  }
}

// ウォッチリストに銘柄が存在するか確認
export async function isInWatchlistDb(userEmail: string, symbol: string): Promise<boolean> {
  try {
    const { rows } = await sql`
      SELECT COUNT(*) as count
      FROM watchlist
      WHERE user_email = ${userEmail} AND symbol = ${symbol.toUpperCase()}
    `;
    return rows[0].count > 0;
  } catch (error) {
    console.error('ウォッチリスト確認エラー:', error);
    throw error;
  }
}

// ウォッチリストをクリア
export async function clearWatchlistDb(userEmail: string): Promise<void> {
  try {
    await sql`
      DELETE FROM watchlist
      WHERE user_email = ${userEmail}
    `;
  } catch (error) {
    console.error('ウォッチリストクリアエラー:', error);
    throw error;
  }
}

// =============================================================
// Twitter Sentiment バッチ処理関連
// =============================================================

export interface TwitterSentimentRow {
  id: number;
  symbol: string;
  tweet_count: number;
  positive_count: number;
  neutral_count: number;
  negative_count: number;
  negative_keyword_count: number;
  sample_tweets: object | null;
  sentiment_score: number;
  fetched_at: string;
}

// twitter_sentiment テーブルの初期化
export async function initializeSentimentTable() {
  try {
    await sql`
      CREATE TABLE IF NOT EXISTS twitter_sentiment (
        id SERIAL PRIMARY KEY,
        symbol TEXT NOT NULL,
        tweet_count INTEGER NOT NULL DEFAULT 0,
        positive_count INTEGER NOT NULL DEFAULT 0,
        neutral_count INTEGER NOT NULL DEFAULT 0,
        negative_count INTEGER NOT NULL DEFAULT 0,
        negative_keyword_count INTEGER NOT NULL DEFAULT 0,
        sample_tweets JSONB,
        sentiment_score NUMERIC(5,2) NOT NULL DEFAULT 0,
        fetched_at TIMESTAMP NOT NULL DEFAULT NOW()
      )
    `;
    await sql`
      CREATE INDEX IF NOT EXISTS idx_twitter_sentiment_symbol
      ON twitter_sentiment(symbol)
    `;
    await sql`
      CREATE INDEX IF NOT EXISTS idx_twitter_sentiment_fetched_at
      ON twitter_sentiment(fetched_at DESC)
    `;
    console.log('twitter_sentiment テーブルの初期化が完了しました');
  } catch (error) {
    console.error('twitter_sentiment テーブル初期化エラー:', error);
    throw error;
  }
}

// 全ユーザーのウォッチリストからユニーク銘柄を取得し、
// 未処理 or 最も古いものを1件返す
export async function getNextSymbolToProcess(): Promise<string | null> {
  try {
    const result = await sql`
      SELECT w.symbol
      FROM (SELECT DISTINCT symbol FROM watchlist) w
      LEFT JOIN (
        SELECT symbol, MAX(fetched_at) AS latest_fetched_at
        FROM twitter_sentiment
        GROUP BY symbol
      ) ts ON w.symbol = ts.symbol
      ORDER BY ts.latest_fetched_at ASC NULLS FIRST
      LIMIT 1
    `;
    if (result.rowCount === 0) return null;
    return result.rows[0].symbol;
  } catch (error) {
    console.error('次の処理対象銘柄の取得エラー:', error);
    throw error;
  }
}

// センチメント結果をDBに保存
export async function saveSentimentResult(data: {
  symbol: string;
  tweetCount: number;
  positiveCount: number;
  neutralCount: number;
  negativeCount: number;
  negativeKeywordCount: number;
  sampleTweets: object[];
  sentimentScore: number;
}): Promise<void> {
  try {
    const sampleTweetsJson = JSON.stringify(data.sampleTweets);
    await sql`
      INSERT INTO twitter_sentiment
        (symbol, tweet_count, positive_count, neutral_count, negative_count,
         negative_keyword_count, sample_tweets, sentiment_score, fetched_at)
      VALUES
        (${data.symbol}, ${data.tweetCount}, ${data.positiveCount},
         ${data.neutralCount}, ${data.negativeCount},
         ${data.negativeKeywordCount}, ${sampleTweetsJson}::jsonb,
         ${data.sentimentScore}, NOW())
    `;
    console.log(`[Database] センチメント保存完了: ${data.symbol}`);
  } catch (error) {
    console.error(`[Database] センチメント保存エラー (${data.symbol}):`, error);
    throw error;
  }
}

// 特定銘柄の最新センチメント結果を取得
export async function getLatestSentiment(symbol: string): Promise<TwitterSentimentRow | null> {
  try {
    const result = await sql`
      SELECT id, symbol, tweet_count, positive_count, neutral_count,
             negative_count, negative_keyword_count, sample_tweets,
             sentiment_score, fetched_at
      FROM twitter_sentiment
      WHERE symbol = ${symbol.toUpperCase()}
      ORDER BY fetched_at DESC
      LIMIT 1
    `;
    if (result.rowCount === 0) return null;
    return result.rows[0] as TwitterSentimentRow;
  } catch (error) {
    console.error(`[Database] センチメント取得エラー (${symbol}):`, error);
    throw error;
  }
}

// 複数銘柄の最新センチメント結果を一括取得
export async function getLatestSentiments(symbols: string[]): Promise<TwitterSentimentRow[]> {
  try {
    if (symbols.length === 0) return [];
    const upperSymbols = symbols.map((s) => s.toUpperCase());
    const result = await sql`
      SELECT DISTINCT ON (symbol)
        id, symbol, tweet_count, positive_count, neutral_count,
        negative_count, negative_keyword_count, sample_tweets,
        sentiment_score, fetched_at
      FROM twitter_sentiment
      WHERE symbol = ANY(${upperSymbols}::text[])
      ORDER BY symbol, fetched_at DESC
    `;
    return result.rows as TwitterSentimentRow[];
  } catch (error) {
    console.error('[Database] 一括センチメント取得エラー:', error);
    throw error;
  }
}
