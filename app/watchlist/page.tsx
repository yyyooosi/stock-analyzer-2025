'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  getWatchlist,
  addToWatchlist,
  removeFromWatchlist,
  WatchlistItem
} from '../utils/watchlist';
import { fetchStockData } from '../utils/stockAPI';
import { calculateAllIndicators, getLatestIndicators } from '../utils/technicalIndicators';
import { analyzeSignals, SignalAnalysis } from '../utils/signalAnalysis';
import { Navigation } from '../components/Navigation';

interface StockQuote {
  symbol: string;
  price: number;
  change: number;
  changePercent: number;
  isLoading: boolean;
  error?: string;
  technicalIndicators?: ReturnType<typeof getLatestIndicators>;
  signalAnalysis?: SignalAnalysis;
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
  const [sortBy, setSortBy] = useState<'symbol' | 'change' | 'changePercent' | 'signal'>('symbol');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  // ウォッチリストを読み込み
  useEffect(() => {
    const loadWatchlist = () => {
      const items = getWatchlist();
      setWatchlist(items);
    };
    loadWatchlist();
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
          const { stock, chart } = await fetchStockData(item.symbol, useRealData);

          // テクニカル指標を計算
          const indicators = calculateAllIndicators(chart);
          const latestIndicators = getLatestIndicators(indicators);

          // シグナル分析用のデータ変換
          const signalData = {
            rsi: latestIndicators.rsi,
            macd: latestIndicators.macd.macd,
            macdSignal: latestIndicators.macd.signal,
            macdHistogram: latestIndicators.macd.histogram,
            sma5: latestIndicators.sma.sma5,
            sma20: latestIndicators.sma.sma20,
            sma50: latestIndicators.sma.sma50,
            bollingerUpper: latestIndicators.bollingerBands.upper,
            bollingerLower: latestIndicators.bollingerBands.lower,
            bollingerMiddle: latestIndicators.bollingerBands.middle
          };

          // シグナル分析の実行
          const signals = analyzeSignals(stock.price, signalData);

          setStockQuotes(prev => new Map(prev).set(item.symbol, {
            symbol: stock.symbol,
            price: stock.price,
            change: stock.change,
            changePercent: stock.changePercent,
            isLoading: false,
            technicalIndicators: latestIndicators,
            signalAnalysis: signals
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
  }, [watchlist, useRealData, stockQuotes]);

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

  const handleSort = (field: 'symbol' | 'change' | 'changePercent' | 'signal') => {
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
      } else if (sortBy === 'signal' && quoteA?.signalAnalysis && quoteB?.signalAnalysis) {
        compareValue = quoteA.signalAnalysis.overallScore - quoteB.signalAnalysis.overallScore;
      }

      return sortOrder === 'asc' ? compareValue : -compareValue;
    });
  };

  const getSignalBadge = (score: number) => {
    if (score >= 60) {
      return <span className="px-2 py-1 bg-green-900 text-green-300 rounded text-xs">買い</span>;
    } else if (score >= 40) {
      return <span className="px-2 py-1 bg-yellow-900 text-yellow-300 rounded text-xs">様子見</span>;
    } else {
      return <span className="px-2 py-1 bg-red-900 text-red-300 rounded text-xs">売り</span>;
    }
  };

  const getRSISignal = (rsi: number | null) => {
    if (rsi === null) return '-';
    if (rsi < 30) return '買い';
    if (rsi > 70) return '売り';
    return '中立';
  };

  const getMACDSignal = (macd: number | null, signal: number | null) => {
    if (macd === null || signal === null) return '-';
    if (macd > signal) return '買い';
    return '売り';
  };

  const sortedWatchlist = getSortedWatchlist();

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <div className="container mx-auto px-4 py-8">
        <header className="mb-8">
          <div className="flex justify-between items-center mb-4">
            <h1 className="text-4xl font-bold">ウォッチリスト</h1>
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
        </header>

        <Navigation />

        {/* 銘柄追加セクション */}
        <div className="bg-gray-800 rounded-lg p-6 mb-8">
          <h2 className="text-xl font-bold mb-4">銘柄を追加</h2>
          <div className="flex gap-4">
            <input
              type="text"
              value={newSymbol}
              onChange={(e) => setNewSymbol(e.target.value.toUpperCase())}
              placeholder="株式シンボル (例: AAPL)"
              className="flex-1 px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg focus:outline-none focus:border-blue-500"
              onKeyPress={(e) => e.key === 'Enter' && handleAddSymbol()}
            />
            <button
              onClick={handleAddSymbol}
              disabled={isAdding}
              className="px-6 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 rounded-lg transition-colors"
            >
              {isAdding ? '追加中...' : '追加'}
            </button>
          </div>
          {addError && (
            <p className="text-red-400 text-sm mt-2">{addError}</p>
          )}
        </div>

        {/* ウォッチリスト表示 */}
        {watchlist.length === 0 ? (
          <div className="text-center text-gray-400 mt-12">
            <p className="text-xl mb-4">ウォッチリストは空です</p>
            <p className="text-sm">上のフォームから銘柄を追加してください</p>
          </div>
        ) : (
          <div className="bg-gray-800 rounded-lg overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-700 sticky top-0">
                <tr>
                  <th
                    className="px-4 py-3 text-left cursor-pointer hover:bg-gray-600"
                    onClick={() => handleSort('symbol')}
                  >
                    銘柄 {sortBy === 'symbol' && (sortOrder === 'asc' ? '↑' : '↓')}
                  </th>
                  <th className="px-4 py-3 text-right">現在価格</th>
                  <th
                    className="px-4 py-3 text-right cursor-pointer hover:bg-gray-600"
                    onClick={() => handleSort('changePercent')}
                  >
                    変動率 {sortBy === 'changePercent' && (sortOrder === 'asc' ? '↑' : '↓')}
                  </th>
                  <th
                    className="px-4 py-3 text-center cursor-pointer hover:bg-gray-600"
                    onClick={() => handleSort('signal')}
                  >
                    シグナル {sortBy === 'signal' && (sortOrder === 'asc' ? '↑' : '↓')}
                  </th>
                  <th className="px-4 py-3 text-center">RSI</th>
                  <th className="px-4 py-3 text-center">MACD</th>
                  <th className="px-4 py-3 text-center">追加日時</th>
                  <th className="px-4 py-3 text-center">操作</th>
                </tr>
              </thead>
              <tbody>
                {sortedWatchlist.map((item) => {
                  const quote = stockQuotes.get(item.symbol);
                  return (
                    <tr key={item.symbol} className="border-b border-gray-700 hover:bg-gray-750">
                      <td className="px-4 py-3">
                        <button
                          onClick={() => handleSymbolClick(item.symbol)}
                          className="text-blue-400 hover:text-blue-300 font-semibold"
                        >
                          {item.symbol}
                        </button>
                      </td>
                      <td className="px-4 py-3 text-right">
                        {quote?.isLoading ? (
                          <span className="text-gray-500">読込中...</span>
                        ) : quote?.error ? (
                          <span className="text-red-400 text-sm">エラー</span>
                        ) : quote ? (
                          <div>
                            <div className="font-semibold">${quote.price.toFixed(2)}</div>
                            <div className={`text-sm ${quote.change >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                              {quote.change >= 0 ? '+' : ''}${quote.change.toFixed(2)}
                            </div>
                          </div>
                        ) : (
                          <span className="text-gray-500">-</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        {quote && !quote.isLoading && !quote.error ? (
                          <span className={`font-semibold ${quote.changePercent >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                            {quote.changePercent >= 0 ? '+' : ''}{quote.changePercent.toFixed(2)}%
                          </span>
                        ) : (
                          <span className="text-gray-500">-</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-center">
                        {quote?.signalAnalysis ? (
                          <div className="flex flex-col items-center gap-1">
                            <span className="text-sm font-semibold">{quote.signalAnalysis.overallScore}/100</span>
                            {getSignalBadge(quote.signalAnalysis.overallScore)}
                          </div>
                        ) : (
                          <span className="text-gray-500">-</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-center">
                        {quote?.technicalIndicators?.rsi !== null && quote?.technicalIndicators?.rsi !== undefined ? (
                          <div className="flex flex-col items-center gap-1">
                            <span className="text-sm">{quote.technicalIndicators.rsi.toFixed(1)}</span>
                            <span className="text-xs text-gray-400">
                              {getRSISignal(quote.technicalIndicators.rsi)}
                            </span>
                          </div>
                        ) : (
                          <span className="text-gray-500">-</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-center">
                        {quote?.technicalIndicators?.macd &&
                         quote.technicalIndicators.macd.macd !== null &&
                         quote.technicalIndicators.macd.signal !== null ? (
                          <div className="flex flex-col items-center gap-1">
                            <span className="text-sm">{quote.technicalIndicators.macd.macd.toFixed(2)}</span>
                            <span className="text-xs text-gray-400">
                              {getMACDSignal(quote.technicalIndicators.macd.macd, quote.technicalIndicators.macd.signal)}
                            </span>
                          </div>
                        ) : (
                          <span className="text-gray-500">-</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-center text-sm text-gray-400">
                        {new Date(item.addedAt).toLocaleDateString('ja-JP')}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <button
                          onClick={() => handleRemoveSymbol(item.symbol)}
                          className="px-3 py-1 bg-red-600 hover:bg-red-700 rounded text-sm transition-colors"
                        >
                          削除
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
