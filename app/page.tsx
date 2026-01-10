'use client';

import { useState, useEffect, useCallback, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { fetchStockData } from './utils/stockAPI';
import { calculateAllIndicators, getLatestIndicators } from './utils/technicalIndicators';
import { analyzeSignals, SignalAnalysis } from './utils/signalAnalysis';
import { runBacktest } from './utils/backtest';
import { fetchCrashTweets, Tweet } from './utils/twitterAPI';
import { predictCrash, CrashPrediction, integrateWithTechnicalAnalysis } from './utils/crashPrediction';
import { addToWatchlistServer, removeFromWatchlistServer, isInWatchlist, getWatchlistFromServer } from './utils/watchlist';
import { StockChart } from './components/StockChart';
import { TechnicalIndicators } from './components/TechnicalIndicators';
import { BuySignal } from './components/BuySignal';
import BacktestResults from './components/BacktestResults';
import { CrashPredictionComponent } from './components/CrashPrediction';

interface StockData {
  symbol: string;
  price: number;
  change: number;
  changePercent: number;
  timestamp: string;
}

interface ChartData {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

function HomeContent() {
  const searchParams = useSearchParams();
  const [stockData, setStockData] = useState<StockData | null>(null);
  const [chartData, setChartData] = useState<ChartData[]>([]);
  const [technicalIndicators, setTechnicalIndicators] = useState<ReturnType<typeof getLatestIndicators> | null>(null);
  const [signalAnalysis, setSignalAnalysis] = useState<SignalAnalysis | null>(null);
  const [backtestResult, setBacktestResult] = useState<ReturnType<typeof runBacktest> | null>(null);
  const [crashPrediction, setCrashPrediction] = useState<CrashPrediction | null>(null);
  const [crashTweets, setCrashTweets] = useState<Tweet[]>([]);
  const [isBacktesting, setIsBacktesting] = useState(false);
  const [isAnalyzingCrash, setIsAnalyzingCrash] = useState(false);
  const [symbol, setSymbol] = useState('AAPL');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [useRealData, setUseRealData] = useState(true);
  const [dataSource, setDataSource] = useState<'real' | 'demo'>('real');
  const [isFallbackData, setIsFallbackData] = useState(false);
  const [fallbackReason, setFallbackReason] = useState<string | null>(null);
  const [inWatchlist, setInWatchlist] = useState(false);
  const [watchlistMessage, setWatchlistMessage] = useState<string | null>(null);

  // 現在の銘柄がウォッチリストに入っているか確認
  useEffect(() => {
    const checkWatchlist = async () => {
      if (stockData) {
        const watchlist = await getWatchlistFromServer();
        const inList = watchlist.some(item => item.symbol.toUpperCase() === stockData.symbol.toUpperCase());
        setInWatchlist(inList);
      }
    };
    checkWatchlist();
  }, [stockData]);

  const handleSearch = useCallback(async () => {
    if (!symbol.trim()) return;

    setLoading(true);
    setError(null);
    setBacktestResult(null);
    setCrashPrediction(null);
    setIsFallbackData(false);
    setFallbackReason(null);

    try {
      const { stock, chart, isFallback, fallbackReason: reason } = await fetchStockData(symbol, useRealData);

      setStockData(stock);
      setChartData(chart);
      setIsFallbackData(isFallback || false);
      setFallbackReason(reason || null);

      // テクニカル指標の計算
      const indicators = calculateAllIndicators(chart);
      const latestIndicators = getLatestIndicators(indicators);
      setTechnicalIndicators(latestIndicators);

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
      setSignalAnalysis(signals);

    } catch (err) {
      console.error('データ取得エラー:', err);
      setError(err instanceof Error ? err.message : 'データの取得に失敗しました');
    } finally {
      setLoading(false);
    }
  }, [symbol, useRealData]);

  // クエリパラメータから銘柄を取得して自動検索
  useEffect(() => {
    const symbolParam = searchParams.get('symbol');
    if (symbolParam) {
      setSymbol(symbolParam.toUpperCase());
    }
  }, [searchParams]);

  // symbolが設定されたら自動検索
  useEffect(() => {
    const symbolParam = searchParams.get('symbol');
    if (symbolParam && symbol === symbolParam.toUpperCase()) {
      handleSearch();
    }
  }, [symbol, searchParams, handleSearch]);

  const handleCrashAnalysis = async () => {
    if (!symbol.trim()) return;

    setIsAnalyzingCrash(true);
    setError(null);

    try {
      console.log(`${symbol}に関する暴落予測分析を開始...`);

      // X投稿を取得
      const tweetResult = await fetchCrashTweets(symbol, useRealData, 100);
      console.log(`${tweetResult.meta.resultCount}件のツイートを取得しました`);

      // ツイートを保存
      setCrashTweets(tweetResult.tweets);

      // 暴落予測を実行
      const prediction = predictCrash(tweetResult.tweets);
      setCrashPrediction(prediction);

      console.log('暴落予測分析が完了しました');
    } catch (err) {
      console.error('暴落予測分析エラー:', err);
      setError(err instanceof Error ? err.message : '暴落予測分析に失敗しました');
    } finally {
      setIsAnalyzingCrash(false);
    }
  };

  const handleBacktest = async () => {
    if (!chartData.length || !technicalIndicators) return;

    setIsBacktesting(true);

    // バックテストは計算量が多いため、少し遅延を入れてUIの応答性を保つ
    setTimeout(() => {
      try {
        const config = {
          initialCapital: 10000,
          commissionRate: 0.001, // 0.1%の手数料
          riskPerTrade: 0.02,    // 1取引あたり2%のリスク
          stopLossPercent: 0.05, // 5%のストップロス
          takeProfitPercent: 0.10 // 10%のテイクプロフィット
        };
        const result = runBacktest(chartData, config);
        setBacktestResult(result);
      } catch (err) {
        console.error('バックテストエラー:', err);
        setError('バックテストの実行に失敗しました');
      } finally {
        setIsBacktesting(false);
      }
    }, 100);
  };

  const handleToggleWatchlist = async () => {
    if (!stockData) return;

    setWatchlistMessage(null);

    try {
      if (inWatchlist) {
        console.log(`[Home] ウォッチリストから ${stockData.symbol} を削除中...`);
        const removed = await removeFromWatchlistServer(stockData.symbol);
        if (removed) {
          setInWatchlist(false);
          setWatchlistMessage(`${stockData.symbol} をウォッチリストから削除しました`);
          console.log(`[Home] ${stockData.symbol} を削除しました`);
        } else {
          setWatchlistMessage(`${stockData.symbol} の削除に失敗しました`);
          console.error(`[Home] ${stockData.symbol} の削除に失敗`);
        }
      } else {
        console.log(`[Home] ウォッチリストに ${stockData.symbol} を追加中...`);
        const added = await addToWatchlistServer(stockData.symbol);
        if (added) {
          setInWatchlist(true);
          setWatchlistMessage(`${stockData.symbol} をウォッチリストに追加しました`);
          console.log(`[Home] ${stockData.symbol} を追加しました`);
        } else {
          setWatchlistMessage(`${stockData.symbol} は既にウォッチリストに登録されています`);
          console.warn(`[Home] ${stockData.symbol} は既に登録済み`);
        }
      }
    } catch (error) {
      console.error('[Home] ウォッチリスト操作エラー:', error);
      setWatchlistMessage(`エラー: ${error instanceof Error ? error.message : 'ウォッチリスト操作に失敗しました'}`);
    }

    // メッセージを3秒後に消す
    setTimeout(() => setWatchlistMessage(null), 3000);
  };

  const toggleDataSource = () => {
    const newSource = dataSource === 'demo' ? 'real' : 'demo';
    setDataSource(newSource);
    setUseRealData(newSource === 'real');
  };

  const getSignalColor = (analysis: SignalAnalysis | null) => {
    if (!analysis) return 'text-gray-400';
    if (analysis.overallScore >= 60) return 'text-green-400';
    if (analysis.overallScore >= 40) return 'text-yellow-400';
    return 'text-red-400';
  };

  const getSignalMessage = (analysis: SignalAnalysis | null) => {
    if (!analysis) return '分析準備中';
    if (analysis.overallScore >= 60) return '買い推奨';
    if (analysis.overallScore >= 40) return '様子見';
    return '買い控え推奨';
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <div className="container mx-auto px-4 py-8">
        {/* ヘッダー */}
        <header className="text-center mb-8">
          <div className="flex justify-between items-center mb-4">
            <h1 className="text-4xl font-bold">米国株分析ツール</h1>
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
              {dataSource === 'real' && (
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                  <span className="text-xs text-gray-400">Alpha Vantage API</span>
                </div>
              )}
            </div>
          </div>
          <p className="text-gray-400">経験豊富な投資家向けの高度な株価分析システム</p>
        </header>

        {/* 検索セクション */}
        <div className="flex justify-center mb-8">
          <div className="flex gap-4 w-full max-w-md">
            <input
              type="text"
              value={symbol}
              onChange={(e) => setSymbol(e.target.value.toUpperCase())}
              placeholder="株式シンボル (例: AAPL, MSFT)"
              className="flex-1 px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg focus:outline-none focus:border-blue-500"
              onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
            />
            <button
              onClick={handleSearch}
              disabled={loading}
              className="px-6 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 rounded-lg transition-colors"
            >
              {loading ? '検索中...' : '検索'}
            </button>
          </div>
        </div>

        {/* エラー表示 */}
        {error && (
          <div className="bg-red-900 border border-red-700 text-red-200 px-4 py-3 rounded-lg mb-6">
            {error}
          </div>
        )}

        {/* フォールバックデータ通知 */}
        {isFallbackData && (
          <div className="bg-yellow-900 border border-yellow-700 text-yellow-200 px-4 py-3 rounded-lg mb-6">
            <div className="flex items-center gap-2">
              <span className="text-lg">⚠️</span>
              <div>
                <p className="font-semibold">サンプルデータを表示しています</p>
                <p className="text-sm text-yellow-300">
                  実データの取得に失敗したため、デモ用のサンプルデータを表示しています。
                  {fallbackReason && ` (理由: ${fallbackReason})`}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* メインコンテンツ */}
        {stockData && (
          <div className="space-y-8">
            {/* 株価情報 */}
            <div className="bg-gray-800 rounded-lg p-6">
              <div className="flex justify-between items-center mb-4">
                <div className="flex items-center gap-4">
                  <h2 className="text-2xl font-bold">{stockData.symbol}</h2>
                  <button
                    onClick={handleToggleWatchlist}
                    className={`px-4 py-2 rounded-lg transition-colors ${
                      inWatchlist
                        ? 'bg-yellow-600 hover:bg-yellow-700'
                        : 'bg-gray-700 hover:bg-gray-600'
                    }`}
                    title={inWatchlist ? 'ウォッチリストから削除' : 'ウォッチリストに追加'}
                  >
                    {inWatchlist ? '★ ウォッチリスト登録済み' : '☆ ウォッチリストに追加'}
                  </button>
                </div>
                <span className="text-sm text-gray-400">{new Date(stockData.timestamp).toLocaleString('ja-JP')}</span>
              </div>
              {watchlistMessage && (
                <div className={`mb-4 px-4 py-2 rounded-lg text-sm ${
                  watchlistMessage.includes('エラー') || watchlistMessage.includes('失敗')
                    ? 'bg-red-900/50 text-red-200'
                    : watchlistMessage.includes('既に')
                    ? 'bg-yellow-900/50 text-yellow-200'
                    : 'bg-green-900/50 text-green-200'
                }`}>
                  {watchlistMessage}
                </div>
              )}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <h3 className="text-gray-400 text-sm mb-1">現在価格</h3>
                  <p className="text-3xl font-bold">${stockData.price.toFixed(2)}</p>
                </div>
                <div>
                  <h3 className="text-gray-400 text-sm mb-1">変動額</h3>
                  <p className={`text-2xl font-bold ${stockData.change >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                    {stockData.change >= 0 ? '+' : ''}${stockData.change.toFixed(2)}
                  </p>
                </div>
                <div>
                  <h3 className="text-gray-400 text-sm mb-1">変動率</h3>
                  <p className={`text-2xl font-bold ${stockData.changePercent >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                    {stockData.changePercent >= 0 ? '+' : ''}{stockData.changePercent.toFixed(2)}%
                  </p>
                </div>
              </div>
            </div>

            {/* チャート */}
            <StockChart data={chartData} symbol={stockData.symbol} />

            {/* テクニカル指標 */}
            {technicalIndicators && (
              <TechnicalIndicators 
                indicators={technicalIndicators} 
                currentPrice={stockData.price}
              />
            )}

            {/* 買いシグナル分析 */}
            {signalAnalysis && (
              <BuySignal 
                analysis={signalAnalysis} 
                symbol={stockData.symbol}
              />
            )}

            {/* バックテストセクション */}
            <div className="bg-gray-800 rounded-lg p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-xl font-bold">バックテスト分析</h3>
                <button
                  onClick={handleBacktest}
                  disabled={isBacktesting || !chartData.length}
                  className="px-6 py-2 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 rounded-lg transition-colors"
                >
                  {isBacktesting ? 'バックテスト実行中...' : 'バックテスト実行'}
                </button>
              </div>

              {backtestResult && (
                <BacktestResults result={backtestResult} />
              )}

              {!backtestResult && !isBacktesting && (
                <p className="text-gray-400">
                  「バックテスト実行」ボタンをクリックして、過去30日間の取引戦略の効果を分析できます。
                </p>
              )}
            </div>

            {/* 暴落予測分析セクション */}
            <div className="bg-gray-800 rounded-lg p-6">
              <div className="flex justify-between items-center mb-4">
                <div>
                  <h3 className="text-xl font-bold">暴落予測分析（X投稿センチメント）</h3>
                  <p className="text-sm text-gray-400 mt-1">X（旧Twitter）の投稿からネガティブワードを分析</p>
                </div>
                <button
                  onClick={handleCrashAnalysis}
                  disabled={isAnalyzingCrash}
                  className="px-6 py-2 bg-red-600 hover:bg-red-700 disabled:bg-gray-600 rounded-lg transition-colors"
                >
                  {isAnalyzingCrash ? '分析中...' : '暴落リスク分析'}
                </button>
              </div>

              {crashPrediction && (
                <CrashPredictionComponent
                  prediction={crashPrediction}
                  symbol={stockData.symbol}
                  tweets={crashTweets}
                />
              )}

              {!crashPrediction && !isAnalyzingCrash && (
                <p className="text-gray-400">
                  「暴落リスク分析」ボタンをクリックして、X投稿のネガティブセンチメントから暴落リスクを分析できます。
                </p>
              )}
            </div>

            {/* 総合判定 */}
            {signalAnalysis && (
              <div className="bg-gray-800 rounded-lg p-6">
                <h3 className="text-xl font-bold mb-4">総合投資判定</h3>

                {/* テクニカル分析スコア */}
                <div className="mb-6">
                  <h4 className="text-lg font-semibold mb-3 text-gray-300">テクニカル分析</h4>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-gray-400 mb-2">テクニカルスコア</p>
                      <p className="text-2xl font-bold">{signalAnalysis.overallScore}/100</p>
                    </div>
                    <div className="text-right">
                      <p className="text-gray-400 mb-2">シグナル</p>
                      <p className={`text-xl font-bold ${getSignalColor(signalAnalysis)}`}>
                        {getSignalMessage(signalAnalysis)}
                      </p>
                    </div>
                  </div>
                  <div className="mt-3 bg-gray-700 rounded-lg h-2">
                    <div
                      className={`h-2 rounded-lg transition-all duration-500 ${
                        signalAnalysis.overallScore >= 60 ? 'bg-green-400' :
                        signalAnalysis.overallScore >= 40 ? 'bg-yellow-400' : 'bg-red-400'
                      }`}
                      style={{ width: `${signalAnalysis.overallScore}%` }}
                    ></div>
                  </div>
                </div>

                {/* 統合判定（暴落予測込み） */}
                {crashPrediction && (() => {
                  const integrated = integrateWithTechnicalAnalysis(
                    crashPrediction,
                    signalAnalysis.signal,
                    signalAnalysis.overallScore
                  );

                  const getIntegratedColor = (signal: string) => {
                    if (signal === 'STRONG_BUY') return 'text-green-500';
                    if (signal === 'BUY') return 'text-green-400';
                    if (signal === 'HOLD') return 'text-yellow-400';
                    if (signal === 'SELL') return 'text-orange-400';
                    if (signal === 'STRONG_SELL') return 'text-red-500';
                    return 'text-gray-400';
                  };

                  const getIntegratedLabel = (signal: string) => {
                    if (signal === 'STRONG_BUY') return '強い買い推奨';
                    if (signal === 'BUY') return '買い推奨';
                    if (signal === 'HOLD') return '様子見';
                    if (signal === 'SELL') return '売り推奨';
                    if (signal === 'STRONG_SELL') return '強い売り推奨';
                    return '判定不能';
                  };

                  return (
                    <div className="border-t border-gray-700 pt-6">
                      <h4 className="text-lg font-semibold mb-3 text-blue-400">統合判定（センチメント + テクニカル）</h4>
                      <div className="flex items-center justify-between mb-4">
                        <div>
                          <p className="text-gray-400 mb-2">最終スコア</p>
                          <p className="text-3xl font-bold">{integrated.finalScore}/100</p>
                        </div>
                        <div className="text-right">
                          <p className="text-gray-400 mb-2">最終判定</p>
                          <p className={`text-2xl font-bold ${getIntegratedColor(integrated.finalSignal)}`}>
                            {getIntegratedLabel(integrated.finalSignal)}
                          </p>
                        </div>
                      </div>
                      <div className="bg-gray-700 rounded-lg h-3">
                        <div
                          className={`h-3 rounded-lg transition-all duration-500 ${
                            integrated.finalScore >= 70 ? 'bg-green-500' :
                            integrated.finalScore >= 55 ? 'bg-green-400' :
                            integrated.finalScore >= 45 ? 'bg-yellow-400' :
                            integrated.finalScore >= 30 ? 'bg-orange-400' :
                            'bg-red-500'
                          }`}
                          style={{ width: `${integrated.finalScore}%` }}
                        ></div>
                      </div>
                      <p className="mt-4 text-sm text-gray-400 bg-gray-700 rounded-lg p-3">
                        {integrated.reasoning}
                      </p>
                    </div>
                  );
                })()}
              </div>
            )}
          </div>
        )}

        {/* 初期状態のメッセージ */}
        {!stockData && !loading && (
          <div className="text-center text-gray-400 mt-12">
            <p className="text-xl mb-4">株式シンボルを入力して分析を開始してください</p>
            <p className="text-sm">例: AAPL (Apple), MSFT (Microsoft), GOOGL (Google), TSLA (Tesla)</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default function Home() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">
        <div className="text-center">
          <p className="text-xl">読み込み中...</p>
        </div>
      </div>
    }>
      <HomeContent />
    </Suspense>
  );
}