'use client';

import { useState } from 'react';
import { fetchStockData } from './utils/stockAPI';
import { calculateAllIndicators, getLatestIndicators } from './utils/technicalIndicators';
import { analyzeSignals, SignalAnalysis } from './utils/signalAnalysis';
import { runBacktest } from './utils/backtest';
import { StockChart } from './components/StockChart';
import { TechnicalIndicators } from './components/TechnicalIndicators';
import { BuySignal } from './components/BuySignal';
import BacktestResults from './components/BacktestResults';

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

export default function Home() {
  const [stockData, setStockData] = useState<StockData | null>(null);
  const [chartData, setChartData] = useState<ChartData[]>([]);
  const [technicalIndicators, setTechnicalIndicators] = useState<ReturnType<typeof getLatestIndicators> | null>(null);
  const [signalAnalysis, setSignalAnalysis] = useState<SignalAnalysis | null>(null);
  const [backtestResult, setBacktestResult] = useState<ReturnType<typeof runBacktest> | null>(null);
  const [isBacktesting, setIsBacktesting] = useState(false);
  const [symbol, setSymbol] = useState('AAPL');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [useRealData, setUseRealData] = useState(true);
  const [dataSource, setDataSource] = useState<'real' | 'demo'>('demo');

  const handleSearch = async () => {
    if (!symbol.trim()) return;

    setLoading(true);
    setError(null);
    setBacktestResult(null);

    try {
      const { stock, chart } = await fetchStockData(symbol, useRealData);
      
      setStockData(stock);
      setChartData(chart);

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

        {/* メインコンテンツ */}
        {stockData && (
          <div className="space-y-8">
            {/* 株価情報 */}
            <div className="bg-gray-800 rounded-lg p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-2xl font-bold">{stockData.symbol}</h2>
                <span className="text-sm text-gray-400">{new Date(stockData.timestamp).toLocaleString('ja-JP')}</span>
              </div>
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

            {/* 総合判定 */}
            {signalAnalysis && (
              <div className="bg-gray-800 rounded-lg p-6">
                <h3 className="text-xl font-bold mb-4">総合投資判定</h3>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-400 mb-2">AIによる総合スコア</p>
                    <p className="text-3xl font-bold">{signalAnalysis.overallScore}/100</p>
                  </div>
                  <div className="text-right">
                    <p className="text-gray-400 mb-2">推奨アクション</p>
                    <p className={`text-2xl font-bold ${getSignalColor(signalAnalysis)}`}>
                      {getSignalMessage(signalAnalysis)}
                    </p>
                  </div>
                </div>
                <div className="mt-4 bg-gray-700 rounded-lg h-2">
                  <div 
                    className={`h-2 rounded-lg transition-all duration-500 ${
                      signalAnalysis.overallScore >= 60 ? 'bg-green-400' :
                      signalAnalysis.overallScore >= 40 ? 'bg-yellow-400' : 'bg-red-400'
                    }`}
                    style={{ width: `${signalAnalysis.overallScore}%` }}
                  ></div>
                </div>
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