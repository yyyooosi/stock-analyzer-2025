'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getWatchlist, addToWatchlist, removeFromWatchlist, WatchlistItem } from '../utils/watchlist';
import { fetchStockData } from '../utils/stockAPI';

interface StockQuote {
  symbol: string;
  price: number;
  change: number;
  changePercent: number;
  isLoading: boolean;
  error?: string;
}

export default function WatchlistPage() {
  const router = useRouter();
  const [watchlist, setWatchlist] = useState<WatchlistItem[]>([]);
  const [stockQuotes, setStockQuotes] = useState<Map<string, StockQuote>>(new Map());
  const [newSymbol, setNewSymbol] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);
  const [useRealData, setUseRealData] = useState(true);
  const [dataSource, setDataSource] = useState<'real' | 'demo'>('real');
  const [sortBy, setSortBy] = useState<'symbol' | 'change' | 'changePercent'>('symbol');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  // ウォッチリストを読み込み
  useEffect(() => {
    const items = getWatchlist();
    setWatchlist(items);
  }, []);

  // 各銘柄の株価を取得
  useEffect(() => {
    if (watchlist.length === 0) return;

    const fetchQuotes = async () => {
      for (const item of watchlist) {
        // 既に読み込み中または読み込み済みの場合はスキップ
        const existingQuote = stockQuotes.get(item.symbol);
        if (existingQuote && !existingQuote.error) continue;

        // 読み込み状態を設定
        setStockQuotes(prev => new Map(prev).set(item.symbol, {
          symbol: item.symbol,
          price: 0,
          change: 0,
          changePercent: 0,
          isLoading: true
        }));

        try {
          const { stock } = await fetchStockData(item.symbol, useRealData);
          setStockQuotes(prev => new Map(prev).set(item.symbol, {
            symbol: stock.symbol,
            price: stock.price,
            change: stock.change,
            changePercent: stock.changePercent,
            isLoading: false
          }));
        } catch (error) {
          console.error(`${item.symbol}の取得に失敗:`, error);
          setStockQuotes(prev => new Map(prev).set(item.symbol, {
            symbol: item.symbol,
            price: 0,
            change: 0,
            changePercent: 0,
            isLoading: false,
            error: error instanceof Error ? error.message : 'データ取得エラー'
          }));
        }

        // レート制限対策: 各リクエストの間に少し待機
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    };

    fetchQuotes();
  }, [watchlist, useRealData]);

  const handleAddSymbol = async () => {
    if (!newSymbol.trim()) return;

    setIsAdding(true);
    setAddError(null);

    try {
      // まず株価データを取得して、有効な銘柄か確認
      await fetchStockData(newSymbol.trim(), useRealData);

      // ウォッチリストに追加
      const added = addToWatchlist(newSymbol.trim());
      if (added) {
        const items = getWatchlist();
        setWatchlist(items);
        setNewSymbol('');
      } else {
        setAddError('この銘柄は既にウォッチリストに登録されています');
      }
    } catch (error) {
      setAddError(error instanceof Error ? error.message : '銘柄の追加に失敗しました');
    } finally {
      setIsAdding(false);
    }
  };

  const handleRemoveSymbol = (symbol: string) => {
    const removed = removeFromWatchlist(symbol);
    if (removed) {
      const items = getWatchlist();
      setWatchlist(items);
      setStockQuotes(prev => {
        const newMap = new Map(prev);
        newMap.delete(symbol);
        return newMap;
      });
    }
  };

  const handleSymbolClick = (symbol: string) => {
    // クエリパラメータで銘柄を渡してホームページに遷移
    router.push(`/?symbol=${symbol}`);
  };

  const toggleDataSource = () => {
    const newSource = dataSource === 'demo' ? 'real' : 'demo';
    setDataSource(newSource);
    setUseRealData(newSource === 'real');
    // データソースを変更したら、既存のクォートをクリア
    setStockQuotes(new Map());
  };

  const handleSort = (field: 'symbol' | 'change' | 'changePercent') => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('asc');
    }
  };

  const getSortedWatchlist = () => {
    return [...watchlist].sort((a, b) => {
      const quoteA = stockQuotes.get(a.symbol);
      const quoteB = stockQuotes.get(b.symbol);

      let compareValue = 0;

      if (sortBy === 'symbol') {
        compareValue = a.symbol.localeCompare(b.symbol);
      } else if (sortBy === 'change' && quoteA && quoteB) {
        compareValue = quoteA.change - quoteB.change;
      } else if (sortBy === 'changePercent' && quoteA && quoteB) {
        compareValue = quoteA.changePercent - quoteB.changePercent;
      }

      return sortOrder === 'asc' ? compareValue : -compareValue;
    });
  };

  const sortedWatchlist = getSortedWatchlist();

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <div className="container mx-auto px-4 py-8">
        {/* ヘッダー */}
        <header className="mb-8">
          <div className="flex justify-between items-center mb-4">
            <h1 className="text-4xl font-bold">マイウォッチリスト</h1>
            <div className="flex items-center gap-4">
              <span className="text-gray-400">データソース:</span>
              <button
                onClick={toggleDataSource}
                className={`px-4 py-2 rounded-lg transition-colors ${
                  dataSource === 'real'
                    ? 'bg-blue-600 hover:bg-blue-700'
                    : 'bg-green-600 hover:bg-green-700'
                }`}
              >
                {dataSource === 'real' ? '🌐 実データ' : '🎭 デモ'}
              </button>
            </div>
          </div>
          <p className="text-gray-400">お気に入りの銘柄を追跡して、リアルタイムで価格変動を確認できます</p>
        </header>

        {/* 銘柄追加セクション */}
        <div className="bg-gray-800 rounded-lg p-6 mb-8">
          <h2 className="text-xl font-bold mb-4">銘柄を追加</h2>
          <div className="flex gap-4">
            <input
              type="text"
              value={newSymbol}
              onChange={(e) => setNewSymbol(e.target.value.toUpperCase())}
              placeholder="株式シンボル (例: AAPL, MSFT)"
              className="flex-1 px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg focus:outline-none focus:border-blue-500"
              onKeyPress={(e) => e.key === 'Enter' && handleAddSymbol()}
              disabled={isAdding}
            />
            <button
              onClick={handleAddSymbol}
              disabled={isAdding || !newSymbol.trim()}
              className="px-6 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 rounded-lg transition-colors"
            >
              {isAdding ? '追加中...' : '追加'}
            </button>
          </div>
          {addError && (
            <div className="mt-4 text-red-400 text-sm">
              {addError}
            </div>
          )}
        </div>

        {/* ウォッチリスト */}
        {watchlist.length === 0 ? (
          <div className="bg-gray-800 rounded-lg p-12 text-center">
            <p className="text-gray-400 text-lg mb-4">ウォッチリストに銘柄が登録されていません</p>
            <p className="text-gray-500 text-sm">上のフォームから銘柄を追加してください</p>
          </div>
        ) : (
          <div className="bg-gray-800 rounded-lg overflow-hidden">
            {/* テーブルヘッダー */}
            <div className="grid grid-cols-12 gap-4 px-6 py-4 bg-gray-700 font-semibold text-sm">
              <div className="col-span-3 flex items-center gap-2 cursor-pointer" onClick={() => handleSort('symbol')}>
                <span>銘柄</span>
                {sortBy === 'symbol' && (
                  <span className="text-blue-400">{sortOrder === 'asc' ? '↑' : '↓'}</span>
                )}
              </div>
              <div className="col-span-2 text-right">現在価格</div>
              <div className="col-span-2 text-right flex items-center justify-end gap-2 cursor-pointer" onClick={() => handleSort('change')}>
                <span>変動額</span>
                {sortBy === 'change' && (
                  <span className="text-blue-400">{sortOrder === 'asc' ? '↑' : '↓'}</span>
                )}
              </div>
              <div className="col-span-2 text-right flex items-center justify-end gap-2 cursor-pointer" onClick={() => handleSort('changePercent')}>
                <span>変動率</span>
                {sortBy === 'changePercent' && (
                  <span className="text-blue-400">{sortOrder === 'asc' ? '↑' : '↓'}</span>
                )}
              </div>
              <div className="col-span-2 text-center">追加日時</div>
              <div className="col-span-1 text-center">操作</div>
            </div>

            {/* テーブルボディ */}
            <div className="divide-y divide-gray-700">
              {sortedWatchlist.map((item) => {
                const quote = stockQuotes.get(item.symbol);

                return (
                  <div
                    key={item.symbol}
                    className="grid grid-cols-12 gap-4 px-6 py-4 hover:bg-gray-750 transition-colors items-center"
                  >
                    <div className="col-span-3">
                      <button
                        onClick={() => handleSymbolClick(item.symbol)}
                        className="text-blue-400 hover:text-blue-300 font-semibold text-lg"
                      >
                        {item.symbol}
                      </button>
                    </div>
                    <div className="col-span-2 text-right">
                      {quote?.isLoading ? (
                        <span className="text-gray-500">読込中...</span>
                      ) : quote?.error ? (
                        <span className="text-red-400 text-xs">エラー</span>
                      ) : quote ? (
                        <span className="font-semibold">${quote.price.toFixed(2)}</span>
                      ) : (
                        <span className="text-gray-500">-</span>
                      )}
                    </div>
                    <div className="col-span-2 text-right">
                      {quote?.isLoading ? (
                        <span className="text-gray-500">-</span>
                      ) : quote?.error ? (
                        <span className="text-gray-500">-</span>
                      ) : quote ? (
                        <span className={quote.change >= 0 ? 'text-green-400' : 'text-red-400'}>
                          {quote.change >= 0 ? '+' : ''}${quote.change.toFixed(2)}
                        </span>
                      ) : (
                        <span className="text-gray-500">-</span>
                      )}
                    </div>
                    <div className="col-span-2 text-right">
                      {quote?.isLoading ? (
                        <span className="text-gray-500">-</span>
                      ) : quote?.error ? (
                        <span className="text-gray-500">-</span>
                      ) : quote ? (
                        <span className={`font-semibold ${quote.changePercent >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                          {quote.changePercent >= 0 ? '+' : ''}{quote.changePercent.toFixed(2)}%
                        </span>
                      ) : (
                        <span className="text-gray-500">-</span>
                      )}
                    </div>
                    <div className="col-span-2 text-center text-sm text-gray-400">
                      {new Date(item.addedAt).toLocaleDateString('ja-JP')}
                    </div>
                    <div className="col-span-1 text-center">
                      <button
                        onClick={() => handleRemoveSymbol(item.symbol)}
                        className="text-red-400 hover:text-red-300 transition-colors"
                        title="削除"
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* 銘柄数の表示 */}
        {watchlist.length > 0 && (
          <div className="mt-4 text-gray-400 text-sm text-center">
            登録銘柄数: {watchlist.length}
          </div>
        )}
      </div>
    </div>
  );
}
