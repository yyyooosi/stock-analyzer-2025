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
