export interface WatchlistItem {
  symbol: string;
  addedAt: string;
}

export interface WatchlistData {
  items: WatchlistItem[];
}

const WATCHLIST_KEY = 'stock-analyzer-watchlist';

// ========================================
// サーバーAPI経由のウォッチリスト操作
// ========================================

// サーバーからウォッチリストを取得
export async function getWatchlistFromServer(): Promise<WatchlistItem[]> {
  try {
    const response = await fetch('/api/watchlist');

    if (!response.ok) {
      if (response.status === 401 || response.status === 503) {
        // 未認証またはサーバーレス環境の場合はlocalStorageを使用
        return getWatchlist();
      }
      throw new Error('ウォッチリストの取得に失敗しました');
    }

    const data: WatchlistData = await response.json();
    return data.items || [];
  } catch (error) {
    console.error('サーバーからのウォッチリスト取得に失敗:', error);
    return getWatchlist(); // フォールバック
  }
}

// サーバーにウォッチリスト項目を追加
export async function addToWatchlistServer(symbol: string): Promise<boolean> {
  try {
    const response = await fetch('/api/watchlist', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ symbol: symbol.toUpperCase() }),
    });

    if (!response.ok) {
      if (response.status === 401 || response.status === 503) {
        // 未認証またはサーバーレス環境の場合はlocalStorageを使用
        return addToWatchlist(symbol);
      }
      return false;
    }

    return true;
  } catch (error) {
    console.error('サーバーへのウォッチリスト追加に失敗:', error);
    return addToWatchlist(symbol); // フォールバック
  }
}

// サーバーからウォッチリスト項目を削除
export async function removeFromWatchlistServer(symbol: string): Promise<boolean> {
  try {
    const response = await fetch(`/api/watchlist?symbol=${encodeURIComponent(symbol.toUpperCase())}`, {
      method: 'DELETE',
    });

    if (!response.ok) {
      if (response.status === 401 || response.status === 503) {
        // 未認証またはサーバーレス環境の場合はlocalStorageを使用
        return removeFromWatchlist(symbol);
      }
      return false;
    }

    return true;
  } catch (error) {
    console.error('サーバーからのウォッチリスト削除に失敗:', error);
    return removeFromWatchlist(symbol); // フォールバック
  }
}

// ========================================
// LocalStorage経由のウォッチリスト操作
// ========================================

// ウォッチリストを取得（localStorage）
export function getWatchlist(): WatchlistItem[] {
  if (typeof window === 'undefined') return [];

  try {
    const data = localStorage.getItem(WATCHLIST_KEY);
    if (!data) return [];

    const watchlist: WatchlistData = JSON.parse(data);
    return watchlist.items || [];
  } catch (error) {
    console.error('ウォッチリストの読み込みに失敗:', error);
    return [];
  }
}

// ウォッチリストに銘柄を追加
export function addToWatchlist(symbol: string): boolean {
  try {
    const watchlist = getWatchlist();

    // 既に存在する場合は追加しない
    if (watchlist.some(item => item.symbol.toUpperCase() === symbol.toUpperCase())) {
      return false;
    }

    const newItem: WatchlistItem = {
      symbol: symbol.toUpperCase(),
      addedAt: new Date().toISOString()
    };

    watchlist.push(newItem);

    const data: WatchlistData = { items: watchlist };
    localStorage.setItem(WATCHLIST_KEY, JSON.stringify(data));

    return true;
  } catch (error) {
    console.error('ウォッチリストへの追加に失敗:', error);
    return false;
  }
}

// ウォッチリストから銘柄を削除
export function removeFromWatchlist(symbol: string): boolean {
  try {
    const watchlist = getWatchlist();
    const filteredWatchlist = watchlist.filter(
      item => item.symbol.toUpperCase() !== symbol.toUpperCase()
    );

    if (filteredWatchlist.length === watchlist.length) {
      return false; // 削除対象が見つからなかった
    }

    const data: WatchlistData = { items: filteredWatchlist };
    localStorage.setItem(WATCHLIST_KEY, JSON.stringify(data));

    return true;
  } catch (error) {
    console.error('ウォッチリストからの削除に失敗:', error);
    return false;
  }
}

// ウォッチリストに銘柄が存在するか確認
export function isInWatchlist(symbol: string): boolean {
  const watchlist = getWatchlist();
  return watchlist.some(item => item.symbol.toUpperCase() === symbol.toUpperCase());
}

// ウォッチリストをクリア
export function clearWatchlist(): void {
  try {
    localStorage.removeItem(WATCHLIST_KEY);
  } catch (error) {
    console.error('ウォッチリストのクリアに失敗:', error);
  }
}
