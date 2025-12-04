'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  getWatchlistFromServer,
  addToWatchlistServer,
  removeFromWatchlistServer,
  WatchlistItem
} from '../utils/watchlist';
import { fetchStockData } from '../utils/stockAPI';
import { calculateAllIndicators, getLatestIndicators } from '../utils/technicalIndicators';
import { analyzeSignals, SignalAnalysis } from '../utils/signalAnalysis';
import StockSymbolSearch, { StockSearchResult } from '../components/StockSymbolSearch';

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
  const [selectedStock, setSelectedStock] = useState<StockSearchResult | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);
  const [useRealData, setUseRealData] = useState(true);
  const [dataSource, setDataSource] = useState<'real' | 'demo'>('real');
  const [sortBy, setSortBy] = useState<'symbol' | 'change' | 'changePercent' | 'signal'>('symbol');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [isRefreshing, setIsRefreshing] = useState(false);

  // ウォッチリストを読み込み
  const loadWatchlist = async () => {
    console.log('[Page] ウォッチリスト読み込み開始');
    setIsRefreshing(true);
    try {
      const items = await getWatchlistFromServer();
      console.log(`[Page] 読み込んだウォッチリスト: ${items.length}件`);
      console.log('[Page] ウォッチリストアイテム:', JSON.stringify(items, null, 2));
      setWatchlist(items);
    } catch (error) {
      console.error('[Page] ウォッチリスト読み込みエラー:', error);
    } finally {
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
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
  }, [watchlist, useRealData]);

  const handleAddSymbol = async () => {
    if (!newSymbol.trim()) return;

    setIsAdding(true);
    setAddError(null);

    try {
      console.log(`[Page] 銘柄追加開始: ${newSymbol.trim()}`);
      // まず株価データを取得して、有効な銘柄か確認
      await fetchStockData(newSymbol.trim(), useRealData);

      // ウォッチリストに追加（サーバーAPI使用）
      const added = await addToWatchlistServer(newSymbol.trim());
      if (added) {
        console.log(`[Page] ${newSymbol.trim()} の追加に成功`);
        await loadWatchlist(); // リフレッシュ
        setNewSymbol('');
      } else {
        console.warn(`[Page] ${newSymbol.trim()} は既に登録済み`);
        setAddError('この銘柄は既にウォッチリストに登録されています');
      }
    } catch (error) {
      console.error('[Page] 銘柄追加エラー:', error);
      setAddError(error instanceof Error ? error.message : '銘柄の追加に失敗しました');
    } finally {
      setIsAdding(false);
    }
  };

  const handleRemoveSymbol = async (symbol: string) => {
    console.log(`[Page] 銘柄削除開始: ${symbol}`);
    const removed = await removeFromWatchlistServer(symbol);
    if (removed) {
      console.log(`[Page] ${symbol} の削除に成功`);
      await loadWatchlist(); // リフレッシュ
      setStockQuotes(prev => {
        const newMap = new Map(prev);
        newMap.delete(symbol);
        return newMap;
      });
    } else {
      console.error(`[Page] ${symbol} の削除に失敗`);
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

  const sortedWatchlist = getSortedWatchlist();
  console.log(`[Page] レンダリングする銘柄数: ${sortedWatchlist.length}`);
  console.log('[Page] ソート済みウォッチリスト:', sortedWatchlist.map(item => item.symbol).join(', '));

  const getSignalColor = (score: number) => {
    if (score >= 60) return 'text-green-400 bg-green-900/30';
    if (score >= 40) return 'text-yellow-400 bg-yellow-900/30';
    return 'text-red-400 bg-red-900/30';
  };

  const getSignalLabel = (score: number) => {
    if (score >= 60) return '買い推奨';
    if (score >= 40) return '様子見';
    return '買い控え';
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <div className="container mx-auto px-4 py-8">
        {/* ヘッダー */}
        <header className="mb-8">
          <div className="flex justify-between items-center mb-4">
            <h1 className="text-4xl font-bold">マイウォッチリスト</h1>
            <div className="flex items-center gap-4">
              <button
                onClick={loadWatchlist}
                disabled={isRefreshing}
                className="px-4 py-2 bg-gray-700 hover:bg-gray-600 disabled:bg-gray-600 rounded-lg transition-colors"
                title="ウォッチリストを再読み込み"
              >
                {isRefreshing ? '🔄 更新中...' : '🔄 更新'}
              </button>
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
            <StockSymbolSearch
              value={newSymbol}
              onChange={setNewSymbol}
              onSelect={setSelectedStock}
              onKeyPress={(e) => e.key === 'Enter' && handleAddSymbol()}
              placeholder="株式シンボル (例: AAPL, MSFT)"
              className="flex-1 px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg focus:outline-none focus:border-blue-500"
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
          <div className="bg-gray-800 rounded-lg overflow-x-auto">
            <table className="w-full">
              {/* テーブルヘッダー */}
              <thead className="bg-gray-700 sticky top-0">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-300 cursor-pointer hover:bg-gray-600" onClick={() => handleSort('symbol')}>
                    銘柄 {sortBy === 'symbol' && (sortOrder === 'asc' ? '↑' : '↓')}
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-300">
                    現在価格
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-300 cursor-pointer hover:bg-gray-600" onClick={() => handleSort('changePercent')}>
                    変動率 {sortBy === 'changePercent' && (sortOrder === 'asc' ? '↑' : '↓')}
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-gray-300 cursor-pointer hover:bg-gray-600" onClick={() => handleSort('signal')}>
                    シグナル {sortBy === 'signal' && (sortOrder === 'asc' ? '↑' : '↓')}
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-gray-300">
                    RSI
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-gray-300">
                    MACD
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-gray-300">
                    移動平均
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-gray-300">
                    ボリンジャー
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-gray-300">
                    追加日
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-gray-300">
                    操作
                  </th>
                </tr>
              </thead>

              {/* テーブルボディ */}
              <tbody className="divide-y divide-gray-700">
                {sortedWatchlist.map((item) => {
                  const quote = stockQuotes.get(item.symbol);

                  return (
                    <tr key={item.symbol} className="hover:bg-gray-750 transition-colors">
                      {/* 銘柄 */}
                      <td className="px-4 py-4 whitespace-nowrap">
                        <button
                          onClick={() => handleSymbolClick(item.symbol)}
                          className="text-blue-400 hover:text-blue-300 font-bold text-lg"
                        >
                          {item.symbol}
                        </button>
                      </td>

                      {/* 現在価格 */}
                      <td className="px-4 py-4 text-right whitespace-nowrap">
                        {quote?.isLoading ? (
                          <span className="text-gray-500 text-sm">読込中...</span>
                        ) : quote?.error ? (
                          <span className="text-red-400 text-xs">エラー</span>
                        ) : quote ? (
                          <div>
                            <div className="font-bold text-lg">${quote.price.toFixed(2)}</div>
                            <div className={`text-xs ${quote.change >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                              {quote.change >= 0 ? '+' : ''}${quote.change.toFixed(2)}
                            </div>
                          </div>
                        ) : (
                          <span className="text-gray-500">-</span>
                        )}
                      </td>

                      {/* 変動率 */}
                      <td className="px-4 py-4 text-right whitespace-nowrap">
                        {quote?.isLoading ? (
                          <span className="text-gray-500">-</span>
                        ) : quote?.error ? (
                          <span className="text-gray-500">-</span>
                        ) : quote ? (
                          <span className={`font-bold text-lg ${quote.changePercent >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                            {quote.changePercent >= 0 ? '+' : ''}{quote.changePercent.toFixed(2)}%
                          </span>
                        ) : (
                          <span className="text-gray-500">-</span>
                        )}
                      </td>

                      {/* シグナル */}
                      <td className="px-4 py-4 text-center whitespace-nowrap">
                        {quote?.isLoading ? (
                          <span className="text-gray-500 text-xs">分析中...</span>
                        ) : quote?.signalAnalysis ? (
                          <div className="flex flex-col items-center gap-1">
                            <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getSignalColor(quote.signalAnalysis.overallScore)}`}>
                              {getSignalLabel(quote.signalAnalysis.overallScore)}
                            </span>
                            <span className="text-sm font-bold">
                              {quote.signalAnalysis.overallScore}/100
                            </span>
                            <div className="w-20 bg-gray-700 rounded-full h-1.5 mt-1">
                              <div
                                className={`h-1.5 rounded-full ${
                                  quote.signalAnalysis.overallScore >= 60 ? 'bg-green-400' :
                                  quote.signalAnalysis.overallScore >= 40 ? 'bg-yellow-400' :
                                  'bg-red-400'
                                }`}
                                style={{ width: `${quote.signalAnalysis.overallScore}%` }}
                              />
                            </div>
                          </div>
                        ) : (
                          <span className="text-gray-500 text-xs">-</span>
                        )}
                      </td>

                      {/* RSI */}
                      <td className="px-4 py-4 text-center whitespace-nowrap">
                        {quote?.technicalIndicators?.rsi !== null && quote?.technicalIndicators?.rsi !== undefined ? (
                          <div className="flex flex-col items-center gap-1">
                            <span className={`font-bold ${
                              quote.technicalIndicators.rsi > 70 ? 'text-red-400' :
                              quote.technicalIndicators.rsi < 30 ? 'text-green-400' :
                              'text-yellow-400'
                            }`}>
                              {quote.technicalIndicators.rsi.toFixed(1)}
                            </span>
                            {quote.signalAnalysis?.signals.rsi && (
                              <span className={`px-2 py-0.5 rounded text-xs font-semibold ${
                                quote.signalAnalysis.signals.rsi.score > 10 ? 'bg-green-900/50 text-green-400' :
                                quote.signalAnalysis.signals.rsi.score < -10 ? 'bg-red-900/50 text-red-400' :
                                'bg-yellow-900/50 text-yellow-400'
                              }`}>
                                {quote.signalAnalysis.signals.rsi.score > 10 ? '買い' :
                                 quote.signalAnalysis.signals.rsi.score < -10 ? '売り' : '中立'}
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-gray-500">-</span>
                        )}
                      </td>

                      {/* MACD */}
                      <td className="px-4 py-4 text-center whitespace-nowrap">
                        {quote?.technicalIndicators?.macd.macd !== null && quote?.technicalIndicators?.macd.macd !== undefined ? (
                          <div className="flex flex-col items-center gap-1">
                            <span className="font-semibold text-white text-sm">
                              {quote.technicalIndicators.macd.macd.toFixed(2)}
                            </span>
                            {quote.signalAnalysis?.signals.macd && (
                              <span className={`px-2 py-0.5 rounded text-xs font-semibold ${
                                quote.signalAnalysis.signals.macd.score > 10 ? 'bg-green-900/50 text-green-400' :
                                quote.signalAnalysis.signals.macd.score < -10 ? 'bg-red-900/50 text-red-400' :
                                'bg-yellow-900/50 text-yellow-400'
                              }`}>
                                {quote.signalAnalysis.signals.macd.score > 10 ? '買い' :
                                 quote.signalAnalysis.signals.macd.score < -10 ? '売り' : '中立'}
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-gray-500">-</span>
                        )}
                      </td>

                      {/* 移動平均 */}
                      <td className="px-4 py-4 text-center whitespace-nowrap">
                        {quote?.technicalIndicators?.sma.sma20 !== null && quote?.technicalIndicators?.sma.sma20 !== undefined ? (
                          <div className="flex flex-col items-center gap-1">
                            <span className="font-semibold text-white text-sm">
                              ${quote.technicalIndicators.sma.sma20.toFixed(2)}
                            </span>
                            {quote.signalAnalysis?.signals.movingAverage && (
                              <span className={`px-2 py-0.5 rounded text-xs font-semibold ${
                                quote.signalAnalysis.signals.movingAverage.score > 10 ? 'bg-green-900/50 text-green-400' :
                                quote.signalAnalysis.signals.movingAverage.score < -10 ? 'bg-red-900/50 text-red-400' :
                                'bg-yellow-900/50 text-yellow-400'
                              }`}>
                                {quote.signalAnalysis.signals.movingAverage.score > 10 ? '買い' :
                                 quote.signalAnalysis.signals.movingAverage.score < -10 ? '売り' : '中立'}
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-gray-500">-</span>
                        )}
                      </td>

                      {/* ボリンジャー */}
                      <td className="px-4 py-4 text-center whitespace-nowrap">
                        {quote?.technicalIndicators?.bollingerBands.upper !== null &&
                         quote?.technicalIndicators?.bollingerBands.upper !== undefined &&
                         quote?.technicalIndicators?.bollingerBands.lower !== null &&
                         quote?.technicalIndicators?.bollingerBands.lower !== undefined ? (
                          <div className="flex flex-col items-center gap-1">
                            <div className="text-xs text-gray-400">
                              ${quote.technicalIndicators.bollingerBands.upper.toFixed(2)}
                            </div>
                            <div className="text-xs text-gray-400">
                              ${quote.technicalIndicators.bollingerBands.lower.toFixed(2)}
                            </div>
                            {quote.signalAnalysis?.signals.bollingerBands && (
                              <span className={`px-2 py-0.5 rounded text-xs font-semibold ${
                                quote.signalAnalysis.signals.bollingerBands.score > 10 ? 'bg-green-900/50 text-green-400' :
                                quote.signalAnalysis.signals.bollingerBands.score < -10 ? 'bg-red-900/50 text-red-400' :
                                'bg-yellow-900/50 text-yellow-400'
                              }`}>
                                {quote.signalAnalysis.signals.bollingerBands.score > 10 ? '買い' :
                                 quote.signalAnalysis.signals.bollingerBands.score < -10 ? '売り' : '中立'}
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-gray-500">-</span>
                        )}
                      </td>

                      {/* 追加日 */}
                      <td className="px-4 py-4 text-center text-xs text-gray-400 whitespace-nowrap">
                        {new Date(item.addedAt).toLocaleDateString('ja-JP', { month: 'short', day: 'numeric' })}
                      </td>

                      {/* 操作 */}
                      <td className="px-4 py-4 text-center whitespace-nowrap">
                        <button
                          onClick={() => handleRemoveSymbol(item.symbol)}
                          className="text-red-400 hover:text-red-300 transition-colors text-xl"
                          title="削除"
                        >
                          ✕
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
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
