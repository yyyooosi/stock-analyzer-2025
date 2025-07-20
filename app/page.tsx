'use client';

import { useState, useEffect } from 'react';
import { StockChart } from './components/StockChart';
import { TechnicalIndicators } from './components/TechnicalIndicators';
import { BuySignal } from './components/BuySignal';
import { BacktestResults } from './components/BacktestResults';
import { calculateAllIndicators, getLatestIndicators } from './utils/technicalIndicators';
import { analyzeSignals, SignalAnalysis } from './utils/signalAnalysis';
import { runBacktest } from './utils/backtest';
import { fetchStockData, StockAPIError } from './utils/stockAPI';

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

  const fetchStockDataHandler = async (inputSymbol: string) => {
    setLoading(true);
    setError(null);

    try {
      console.log(`データ取得開始: ${inputSymbol}, 実データモード: ${useRealData}`);
      
      // 実データまたはサンプルデータを取得
      const { stock, chart } = await fetchStockData(inputSymbol, useRealData);
      
      // データソースを記録
      setDataSource(useRealData && process.env.NEXT_PUBLIC_ALPHA_VANTAGE_API_KEY ? 'real' : 'demo');
      
      setStockData(stock);
      setChartData(chart);
      
      // テクニカル指標を計算
      const indicators = calculateAllIndicators(chart);
      const latestIndicators = getLatestIndicators(indicators);
      setTechnicalIndicators(latestIndicators);
      
      // 買い時シグナルを分析
      const analysis = analyzeSignals(latestIndicators, stock.price);
      setSignalAnalysis(analysis);
      
      // デバッグ用ログ
      console.log('データ取得完了:', {
        symbol: stock.symbol,
        price: stock.price,
        chartDays: chart.length,
        dataSource: dataSource
      });
      
      // バックテスト結果をクリア
      setBacktestResult(null);
      
    } catch (err) {
      if (err instanceof StockAPIError) {
        setError(err.message);
      } else {
        setError('データの取得に失敗しました');
      }
      console.error('データ取得エラー:', err);
    } finally {
      setLoading(false);
    }
  };

  const runBacktestAnalysis = async () => {
    if (!chartData.length) return;
    
    console.log('Starting backtest with data:', chartData.length, 'days');
    setIsBacktesting(true);
    
    try {
      // バックテストを実行
      const result = runBacktest(chartData, {
        initialCapital: 10000,
        commissionRate: 0.001,
        riskPerTrade: 0.1, // 10%に増加
        stopLossPercent: 0.08, // 8%に調整
        takeProfitPercent: 0.12 // 12%に調整
      });
      
      console.log('Backtest completed:', result); // デバッグ用
      console.log('Number of trades:', result.trades.length);
      console.log('Performance:', result.performance);
      setBacktestResult(result);
    } catch (err) {
      setError('バックテストの実行に失敗しました');
      console.error('Error running backtest:', err);
    } finally {
      setIsBacktesting(false);
    }
  };

  useEffect(() => {
    fetchStockDataHandler(symbol);
  }, []);

  const handleSymbolChange = (e: React.FormEvent) => {
    e.preventDefault();
    fetchStockDataHandler(symbol);
  };

  const toggleDataMode = () => {
    const newMode = !useRealData;
    setUseRealData(newMode);
    // モード変更時に再度データを取得
    fetchStockDataHandler(symbol);
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(price);
  };

  const formatPercent = (percent: number) => {
    return `${percent >= 0 ? '+' : ''}${percent.toFixed(2)}%`;
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white p-8">
      <div className="max-w-6xl mx-auto">
        {/* ヘッダー */}
        <div className="mb-8">
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-4xl font-bold mb-4">米国株分析ツール</h1>
              <p className="text-gray-400">経験豊富な投資家向けの高度な株価分析システム</p>
            </div>
            
            {/* データソース切り替え */}
            <div className="flex flex-col items-end space-y-2">
              <div className="flex items-center space-x-3">
                <span className="text-sm text-gray-400">データソース:</span>
                <button
                  onClick={toggleDataMode}
                  className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${
                    useRealData 
                      ? 'bg-green-600 hover:bg-green-700 text-white' 
                      : 'bg-yellow-600 hover:bg-yellow-700 text-white'
                  }`}
                >
                  {useRealData ? '🌐 実データ' : '🎭 デモ'}
                </button>
              </div>
              
              {/* データソース状態表示 */}
              <div className="flex items-center space-x-2 text-xs">
                <div className={`w-2 h-2 rounded-full ${
                  dataSource === 'real' ? 'bg-green-400' : 'bg-yellow-400'
                }`}></div>
                <span className="text-gray-500">
                  {dataSource === 'real' ? 'Alpha Vantage API' : 'サンプルデータ'}
                </span>
              </div>
              
              {/* APIキー状態 */}
              {useRealData && !process.env.NEXT_PUBLIC_ALPHA_VANTAGE_API_KEY && (
                <div className="text-xs text-orange-400">
                  ⚠️ APIキー未設定
                </div>
              )}
            </div>
          </div>
        </div>

        {/* 検索フォーム */}
        <div className="mb-8">
          <form onSubmit={handleSymbolChange} className="flex gap-4">
            <div className="flex-1 max-w-md">
              <input
                type="text"
                value={symbol}
                onChange={(e) => setSymbol(e.target.value.toUpperCase())}
                placeholder="株式シンボル (例: AAPL, MSFT, GOOGL)"
                className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 rounded-lg transition-colors"
            >
              {loading ? '読み込み中...' : '検索'}
            </button>
          </form>
        </div>

        {/* エラー表示 */}
        {error && (
          <div className="mb-8 p-4 bg-red-900 border border-red-600 rounded-lg">
            <div className="flex items-start space-x-2">
              <span className="text-red-200">⚠️</span>
              <div>
                <p className="text-red-200 font-semibold">エラーが発生しました</p>
                <p className="text-red-300 text-sm mt-1">{error}</p>
                {error.includes('APIキー') && (
                  <div className="mt-3 p-3 bg-red-800 rounded text-xs">
                    <p className="font-semibold mb-2">APIキー設定方法:</p>
                    <ol className="list-decimal list-inside space-y-1">
                      <li>Alpha VantageでAPIキーを取得: https://www.alphavantage.co/support/#api-key</li>
                      <li>プロジェクトルートに .env.local ファイルを作成</li>
                      <li>NEXT_PUBLIC_ALPHA_VANTAGE_API_KEY=YOUR_API_KEY を記述</li>
                      <li>開発サーバーを再起動</li>
                    </ol>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* 株価データ表示 */}
        {stockData && (
          <div className="mb-8">
            <div className="bg-gray-800 p-6 rounded-lg">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-2xl font-bold">{stockData.symbol}</h2>
                <span className="text-sm text-gray-400">
                  {new Date(stockData.timestamp).toLocaleString('ja-JP')}
                </span>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="text-center">
                  <p className="text-sm text-gray-400">現在価格</p>
                  <p className="text-3xl font-bold">{formatPrice(stockData.price)}</p>
                </div>
                
                <div className="text-center">
                  <p className="text-sm text-gray-400">変動額</p>
                  <p className={`text-2xl font-bold ${
                    stockData.change >= 0 ? 'text-green-400' : 'text-red-400'
                  }`}>
                    {stockData.change >= 0 ? '+' : ''}{formatPrice(stockData.change)}
                  </p>
                </div>
                
                <div className="text-center">
                  <p className="text-sm text-gray-400">変動率</p>
                  <p className={`text-2xl font-bold ${
                    stockData.changePercent >= 0 ? 'text-green-400' : 'text-red-400'
                  }`}>
                    {formatPercent(stockData.changePercent)}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* チャート表示 */}
        {chartData.length > 0 && (
          <div className="mb-8">
            <StockChart data={chartData} symbol={stockData?.symbol || symbol} />
          </div>
        )}

        {/* テクニカル指標表示 */}
        {technicalIndicators && stockData && (
          <div className="mb-8">
            <TechnicalIndicators 
              indicators={technicalIndicators} 
              currentPrice={stockData.price} 
            />
          </div>
        )}

        {/* 買い時シグナル分析 */}
        {signalAnalysis && stockData && (
          <div className="mb-8">
            <BuySignal 
              analysis={signalAnalysis} 
              symbol={stockData.symbol} 
            />
          </div>
        )}

        {/* バックテストセクション */}
        {chartData.length > 0 && (
          <div className="mb-8">
            <div className="bg-gray-800 p-6 rounded-lg">
              <div className="flex justify-between items-center mb-4">
                <div>
                  <h3 className="text-xl font-bold">⚡ 戦略バックテスト</h3>
                  <p className="text-gray-400 mt-1">
                    過去30日間のデータを使用して、シグナル戦略の有効性を検証します
                  </p>
                </div>
                <button
                  onClick={runBacktestAnalysis}
                  disabled={isBacktesting}
                  className="px-6 py-3 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 text-white rounded-lg font-semibold transition-colors"
                >
                  {isBacktesting ? 'バックテスト実行中...' : 'バックテスト実行'}
                </button>
              </div>
              
              {backtestResult && (
                <BacktestResults 
                  result={backtestResult} 
                  symbol={stockData?.symbol || symbol}
                  initialCapital={10000}
                />
              )}
            </div>
          </div>
        )}

        {/* チャートデータ表示 */}
        {chartData.length > 0 && (
          <div className="mb-8">
            <div className="bg-gray-800 p-6 rounded-lg">
              <h3 className="text-xl font-bold mb-4">30日間の価格推移</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-700">
                      <th className="text-left p-2">日付</th>
                      <th className="text-right p-2">始値</th>
                      <th className="text-right p-2">高値</th>
                      <th className="text-right p-2">安値</th>
                      <th className="text-right p-2">終値</th>
                      <th className="text-right p-2">出来高</th>
                    </tr>
                  </thead>
                  <tbody>
                    {chartData.slice(-10).reverse().map((data, index) => (
                      <tr key={index} className="border-b border-gray-700">
                        <td className="p-2">{data.date}</td>
                        <td className="text-right p-2">{formatPrice(data.open)}</td>
                        <td className="text-right p-2">{formatPrice(data.high)}</td>
                        <td className="text-right p-2">{formatPrice(data.low)}</td>
                        <td className="text-right p-2">{formatPrice(data.close)}</td>
                        <td className="text-right p-2">{data.volume.toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* フッター */}
        <div className="text-center text-gray-400 mt-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <div className="bg-gray-800 p-4 rounded-lg">
              <h4 className="font-semibold text-white mb-2">🌐 実データモード</h4>
              <p className="text-sm">
                Alpha Vantage APIから実際の株価データを取得。
                最新の市場情報で正確な分析が可能です。
              </p>
            </div>
            <div className="bg-gray-800 p-4 rounded-lg">
              <h4 className="font-semibold text-white mb-2">🎭 デモモード</h4>
              <p className="text-sm">
                シミュレートされたデータで機能をお試し。
                APIキーなしでも全機能を体験できます。
              </p>
            </div>
          </div>
          
          <p className="text-sm">
            🎯 高度な機能: テクニカル指標分析、買い時シグナル、バックテスト戦略検証
          </p>
          
          <div className="mt-4 text-xs text-gray-500">
            <p>現在のデータソース: <span className="font-semibold">{dataSource === 'real' ? 'Alpha Vantage API (実データ)' : 'サンプルデータ (デモ)'}</span></p>
            {dataSource === 'real' && <p>※ APIレート制限: 1分間に5回、1日500回まで</p>}
          </div>
        </div>
      </div>
    </div>
  );
}