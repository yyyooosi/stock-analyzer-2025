export interface WatchlistItem {
  symbol: string;
  addedAt: string;
}

export interface WatchlistData {
  items: WatchlistItem[];
}

const WATCHLIST_KEY = 'stock-analyzer-watchlist';

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
