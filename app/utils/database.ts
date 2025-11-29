import Database from 'better-sqlite3';
import path from 'path';

const dbPath = path.join(process.cwd(), 'watchlist.db');
let db: Database.Database | null = null;

export function getDatabase() {
  if (!db) {
    db = new Database(dbPath);
    initializeDatabase(db);
  }
  return db;
}

function initializeDatabase(database: Database.Database) {
  // ウォッチリストテーブルを作成
  database.exec(`
    CREATE TABLE IF NOT EXISTS watchlist (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_email TEXT NOT NULL,
      symbol TEXT NOT NULL,
      added_at TEXT NOT NULL,
      UNIQUE(user_email, symbol)
    )
  `);

  // インデックスを作成
  database.exec(`
    CREATE INDEX IF NOT EXISTS idx_user_email ON watchlist(user_email);
  `);
}

export interface WatchlistDbItem {
  id: number;
  user_email: string;
  symbol: string;
  added_at: string;
}

// ユーザーのウォッチリストを取得
export function getUserWatchlist(userEmail: string): WatchlistDbItem[] {
  const db = getDatabase();
  const stmt = db.prepare('SELECT * FROM watchlist WHERE user_email = ? ORDER BY added_at DESC');
  return stmt.all(userEmail) as WatchlistDbItem[];
}

// ウォッチリストに銘柄を追加
export function addToWatchlistDb(userEmail: string, symbol: string): boolean {
  const db = getDatabase();
  try {
    const stmt = db.prepare('INSERT INTO watchlist (user_email, symbol, added_at) VALUES (?, ?, ?)');
    stmt.run(userEmail, symbol.toUpperCase(), new Date().toISOString());
    return true;
  } catch (error) {
    // UNIQUE制約違反の場合はfalseを返す
    if (error instanceof Error && error.message.includes('UNIQUE constraint failed')) {
      return false;
    }
    throw error;
  }
}

// ウォッチリストから銘柄を削除
export function removeFromWatchlistDb(userEmail: string, symbol: string): boolean {
  const db = getDatabase();
  const stmt = db.prepare('DELETE FROM watchlist WHERE user_email = ? AND symbol = ?');
  const result = stmt.run(userEmail, symbol.toUpperCase());
  return result.changes > 0;
}

// ウォッチリストに銘柄が存在するか確認
export function isInWatchlistDb(userEmail: string, symbol: string): boolean {
  const db = getDatabase();
  const stmt = db.prepare('SELECT COUNT(*) as count FROM watchlist WHERE user_email = ? AND symbol = ?');
  const result = stmt.get(userEmail, symbol.toUpperCase()) as { count: number };
  return result.count > 0;
}

// ウォッチリストをクリア
export function clearWatchlistDb(userEmail: string): void {
  const db = getDatabase();
  const stmt = db.prepare('DELETE FROM watchlist WHERE user_email = ?');
  stmt.run(userEmail);
}
