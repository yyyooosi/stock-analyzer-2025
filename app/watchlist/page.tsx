'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getWatchlist, addToWatchlist, removeFromWatchlist, WatchlistItem } from '../utils/watchlist';
import { fetchStockData } from '../utils/stockAPI';
import { calculateAllIndicators, getLatestIndicators } from '../utils/technicalIndicators';
import { analyzeSignals, SignalAnalysis } from '../utils/signalAnalysis';

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

  const sortedWatchlist = getSortedWatchlist();

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
              <div className="col-span-2 flex items-center gap-2 cursor-pointer" onClick={() => handleSort('symbol')}>
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
              <div className="col-span-2 text-center flex items-center justify-center gap-2 cursor-pointer" onClick={() => handleSort('signal')}>
                <span>シグナル</span>
                {sortBy === 'signal' && (
                  <span className="text-blue-400">{sortOrder === 'asc' ? '↑' : '↓'}</span>
                )}
              </div>
              <div className="col-span-1 text-center">追加日</div>
              <div className="col-span-1 text-center">操作</div>
            </div>

            {/* テーブルボディ */}
            <div className="divide-y divide-gray-700">
              {sortedWatchlist.map((item) => {
                const quote = stockQuotes.get(item.symbol);

                return (
                  <div key={item.symbol}>
                    {/* メイン行 */}
                    <div className="grid grid-cols-12 gap-4 px-6 py-4 hover:bg-gray-750 transition-colors items-center">
                      <div className="col-span-2 flex items-center gap-2">
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
                      <div className="col-span-2 text-center">
                        {quote?.isLoading ? (
                          <span className="text-gray-500 text-xs">分析中...</span>
                        ) : quote?.signalAnalysis ? (
                          <div className="flex flex-col items-center gap-1">
                            <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getSignalColor(quote.signalAnalysis.overallScore)}`}>
                              {getSignalLabel(quote.signalAnalysis.overallScore)}
                            </span>
                            <span className="text-xs text-gray-400">
                              {quote.signalAnalysis.overallScore}/100
                            </span>
                          </div>
                        ) : (
                          <span className="text-gray-500 text-xs">-</span>
                        )}
                      </div>
                      <div className="col-span-1 text-center text-xs text-gray-400">
                        {new Date(item.addedAt).toLocaleDateString('ja-JP', { month: 'short', day: 'numeric' })}
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

                    {/* 詳細ビュー */}
                    {quote?.technicalIndicators && quote?.signalAnalysis && (
                      <div className="px-6 py-4 bg-gray-900/50 border-t border-gray-700">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          {/* テクニカル指標 */}
                          <div>
                            <h4 className="text-sm font-semibold text-gray-300 mb-3">テクニカル指標</h4>
                            <div className="space-y-2 text-sm">
                              <div className="flex justify-between">
                                <span className="text-gray-400">RSI:</span>
                                <span className={`font-semibold ${
                                  quote.technicalIndicators.rsi !== null && quote.technicalIndicators.rsi > 70 ? 'text-red-400' :
                                  quote.technicalIndicators.rsi !== null && quote.technicalIndicators.rsi < 30 ? 'text-green-400' :
                                  'text-yellow-400'
                                }`}>
                                  {quote.technicalIndicators.rsi !== null ? quote.technicalIndicators.rsi.toFixed(2) : '-'}
                                </span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-gray-400">MACD:</span>
                                <span className="font-semibold text-white">
                                  {quote.technicalIndicators.macd.macd !== null ? quote.technicalIndicators.macd.macd.toFixed(2) : '-'}
                                </span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-gray-400">SMA 5日:</span>
                                <span className="font-semibold text-white">
                                  {quote.technicalIndicators.sma.sma5 !== null ? `$${quote.technicalIndicators.sma.sma5.toFixed(2)}` : '-'}
                                </span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-gray-400">SMA 20日:</span>
                                <span className="font-semibold text-white">
                                  {quote.technicalIndicators.sma.sma20 !== null ? `$${quote.technicalIndicators.sma.sma20.toFixed(2)}` : '-'}
                                </span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-gray-400">SMA 50日:</span>
                                <span className="font-semibold text-white">
                                  {quote.technicalIndicators.sma.sma50 !== null ? `$${quote.technicalIndicators.sma.sma50.toFixed(2)}` : '-'}
                                </span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-gray-400">ボリンジャー上限:</span>
                                <span className="font-semibold text-white">
                                  {quote.technicalIndicators.bollingerBands.upper !== null ? `$${quote.technicalIndicators.bollingerBands.upper.toFixed(2)}` : '-'}
                                </span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-gray-400">ボリンジャー下限:</span>
                                <span className="font-semibold text-white">
                                  {quote.technicalIndicators.bollingerBands.lower !== null ? `$${quote.technicalIndicators.bollingerBands.lower.toFixed(2)}` : '-'}
                                </span>
                              </div>
                            </div>
                          </div>

                          {/* シグナル分析 */}
                          <div>
                            <h4 className="text-sm font-semibold text-gray-300 mb-3">シグナル分析</h4>
                            <div className="space-y-3">
                              <div>
                                <div className="flex justify-between mb-1">
                                  <span className="text-gray-400 text-sm">総合スコア</span>
                                  <span className="font-semibold text-white">
                                    {quote.signalAnalysis.overallScore}/100
                                  </span>
                                </div>
                                <div className="bg-gray-700 rounded-full h-2">
                                  <div
                                    className={`h-2 rounded-full transition-all ${
                                      quote.signalAnalysis.overallScore >= 60 ? 'bg-green-400' :
                                      quote.signalAnalysis.overallScore >= 40 ? 'bg-yellow-400' :
                                      'bg-red-400'
                                    }`}
                                    style={{ width: `${quote.signalAnalysis.overallScore}%` }}
                                  />
                                </div>
                              </div>

                              <div className="space-y-2 text-sm">
                                {Object.entries(quote.signalAnalysis.signals).map(([key, signal]) => (
                                  <div key={key} className="flex items-start justify-between gap-2">
                                    <span className="text-gray-400 capitalize">{
                                      key === 'movingAverage' ? '移動平均' :
                                      key === 'bollingerBands' ? 'ボリンジャー' :
                                      key.toUpperCase()
                                    }:</span>
                                    <span className={`px-2 py-1 rounded text-xs font-semibold ${
                                      signal.score > 10 ? 'bg-green-900/50 text-green-400' :
                                      signal.score < -10 ? 'bg-red-900/50 text-red-400' :
                                      'bg-yellow-900/50 text-yellow-400'
                                    }`}>
                                      {signal.score > 10 ? '買い' :
                                       signal.score < -10 ? '売り' : '中立'}
                                    </span>
                                  </div>
                                ))}
                              </div>

                              <div className="mt-4 pt-3 border-t border-gray-700">
                                <p className="text-xs text-gray-400">
                                  <span className="font-semibold">{quote.signalAnalysis.recommendation}</span>
                                </p>
                                <p className="text-xs text-gray-500 mt-1">
                                  信頼度: {quote.signalAnalysis.confidence}%
                                </p>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
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
