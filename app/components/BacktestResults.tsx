'use client';

import { useEffect, useRef } from 'react';
import { Chart as ChartJS, CategoryScale, LinearScale, LineElement, PointElement, Title, Tooltip, Legend } from 'chart.js';

// Chart.jsの登録
ChartJS.register(CategoryScale, LinearScale, LineElement, PointElement, Title, Tooltip, Legend);

interface BacktestResultsProps {
  result: any; // 動的に対応するためany型を使用
}

export default function BacktestResults({ result }: BacktestResultsProps) {
  const chartRef = useRef<HTMLCanvasElement>(null);
  const chartInstance = useRef<ChartJS | null>(null);

  useEffect(() => {
    if (!chartRef.current) return;

    const ctx = chartRef.current.getContext('2d');
    if (!ctx) return;

    // 既存のチャートを破棄
    if (chartInstance.current) {
      chartInstance.current.destroy();
    }

    // 新しいチャートを作成
    chartInstance.current = new ChartJS(ctx, {
      type: 'line',
      data: {
        labels: (result.portfolioHistory || []).map((h: any) => h.date),
        datasets: [
          {
            label: 'ポートフォリオ価値',
            data: (result.portfolioHistory || []).map((h: any) => h.value || h.portfolioValue),
            borderColor: 'rgb(59, 130, 246)',
            backgroundColor: 'rgba(59, 130, 246, 0.1)',
            tension: 0.1,
            fill: true
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          title: {
            display: true,
            text: 'ポートフォリオ価値の推移',
            color: 'rgb(243, 244, 246)'
          },
          legend: {
            labels: {
              color: 'rgb(156, 163, 175)'
            }
          },
          tooltip: {
            backgroundColor: 'rgba(17, 24, 39, 0.9)',
            titleColor: 'rgb(243, 244, 246)',
            bodyColor: 'rgb(156, 163, 175)',
            borderColor: 'rgb(75, 85, 99)',
            borderWidth: 1,
            callbacks: {
              label: function(context: any) {
                const label = context.dataset.label || '';
                const value = context.parsed.y;
                return `${label}: ${formatCurrency(value)}`;
              }
            }
          }
        },
        scales: {
          x: {
            grid: {
              color: 'rgba(75, 85, 99, 0.3)'
            },
            ticks: {
              color: 'rgb(156, 163, 175)'
            }
          },
          y: {
            grid: {
              color: 'rgba(75, 85, 99, 0.3)'
            },
            ticks: {
              color: 'rgb(156, 163, 175)',
              callback: function(value: string | number) {
                return formatCurrency(Number(value));
              }
            },
            beginAtZero: false
          }
        }
      }
    });

    // クリーンアップ関数
    return () => {
      if (chartInstance.current) {
        chartInstance.current.destroy();
        chartInstance.current = null;
      }
    };
  }, [result]);

  const formatCurrency = (value: number): string => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(value);
  };

  const formatPercent = (value: number): string => {
    return `${value >= 0 ? '+' : ''}${value.toFixed(2)}%`;
  };

  const getPerformanceColor = (value: number): string => {
    if (value > 0) return 'text-green-400';
    if (value < 0) return 'text-red-400';
    return 'text-gray-400';
  };

  const getPerformanceLabel = (returnPercent: number): string => {
    if (returnPercent > 20) return '優秀';
    if (returnPercent > 10) return '良好';
    if (returnPercent > 0) return 'プラス';
    if (returnPercent > -10) return 'マイナス';
    return '要改善';
  };

  return (
    <div className="space-y-6">
      {/* サマリー統計 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-gray-700 rounded-lg p-4">
          <h4 className="text-gray-400 text-sm mb-1">総リターン</h4>
          <p className={`text-xl font-bold ${getPerformanceColor(result.totalReturn || 0)}`}>
            {formatCurrency(result.totalReturn || 0)}
          </p>
          <p className={`text-sm ${getPerformanceColor(result.totalReturnPercent || 0)}`}>
            {formatPercent(result.totalReturnPercent || 0)}
          </p>
        </div>

        <div className="bg-gray-700 rounded-lg p-4">
          <h4 className="text-gray-400 text-sm mb-1">勝率</h4>
          <p className="text-xl font-bold text-blue-400">
            {formatPercent(result.winRate || 0)}
          </p>
          <p className="text-sm text-gray-400">
            {result.winningTrades || 0}/{result.totalTrades || 0}勝
          </p>
        </div>

        <div className="bg-gray-700 rounded-lg p-4">
          <h4 className="text-gray-400 text-sm mb-1">最大ドローダウン</h4>
          <p className="text-xl font-bold text-red-400">
            {formatPercent(result.maxDrawdown || 0)}
          </p>
          <p className="text-sm text-gray-400">最大下落幅</p>
        </div>

        <div className="bg-gray-700 rounded-lg p-4">
          <h4 className="text-gray-400 text-sm mb-1">シャープレシオ</h4>
          <p className="text-xl font-bold text-purple-400">
            {(result.sharpeRatio || 0).toFixed(2)}
          </p>
          <p className="text-sm text-gray-400">リスク調整後リターン</p>
        </div>
      </div>

      {/* パフォーマンス評価 */}
      <div className="bg-gray-700 rounded-lg p-4">
        <div className="flex justify-between items-center">
          <div>
            <h4 className="text-lg font-semibold mb-2">戦略パフォーマンス</h4>
            <p className="text-gray-400">
              初期資金 {formatCurrency(result.initialCapital || 10000)} → 最終価値 {formatCurrency(result.finalValue || 10000)}
            </p>
          </div>
          <div className="text-right">
            <p className="text-2xl font-bold text-blue-400">
              {getPerformanceLabel(result.totalReturnPercent || 0)}
            </p>
            <p className="text-sm text-gray-400">総合評価</p>
          </div>
        </div>
      </div>

      {/* ポートフォリオ価値チャート */}
      <div className="bg-gray-700 rounded-lg p-4">
        <div className="h-64 w-full">
          <canvas ref={chartRef}></canvas>
        </div>
      </div>

      {/* 詳細統計 */}
      <div className="bg-gray-700 rounded-lg p-4">
        <h4 className="text-lg font-semibold mb-4">詳細分析</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h5 className="text-sm font-semibold text-gray-400 mb-3">取引統計</h5>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-gray-300">総取引数:</span>
                <span className="text-white">{result.totalTrades || 0}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-300">勝利取引:</span>
                <span className="text-green-400">{result.winningTrades || 0}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-300">敗北取引:</span>
                <span className="text-red-400">{result.losingTrades || 0}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-300">勝率:</span>
                <span className="text-blue-400">{formatPercent(result.winRate || 0)}</span>
              </div>
            </div>
          </div>

          <div>
            <h5 className="text-sm font-semibold text-gray-400 mb-3">リスク指標</h5>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-gray-300">最大ドローダウン:</span>
                <span className="text-red-400">{formatPercent(result.maxDrawdown || 0)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-300">シャープレシオ:</span>
                <span className="text-purple-400">{(result.sharpeRatio || 0).toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-300">総リターン:</span>
                <span className={getPerformanceColor(result.totalReturnPercent || 0)}>
                  {formatPercent(result.totalReturnPercent || 0)}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 最近の取引履歴 */}
      <div className="bg-gray-700 rounded-lg p-4">
        <h4 className="text-lg font-semibold mb-4">取引履歴（最新5件）</h4>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-gray-400 border-b border-gray-600">
                <th className="text-left pb-2">日付</th>
                <th className="text-left pb-2">アクション</th>
                <th className="text-right pb-2">価格</th>
                <th className="text-right pb-2">株数</th>
                <th className="text-right pb-2">金額</th>
              </tr>
            </thead>
            <tbody>
              {(result.trades || []).slice(-5).reverse().map((trade: any, index: number) => (
                <tr key={index} className="border-b border-gray-700">
                  <td className="py-2 text-gray-300">{trade.date}</td>
                  <td className="py-2">
                    <span className={`px-2 py-1 rounded text-xs font-semibold ${
                      trade.action === 'buy' 
                        ? 'bg-green-600 text-green-100' 
                        : 'bg-red-600 text-red-100'
                    }`}>
                      {trade.action === 'buy' ? '購入' : '売却'}
                    </span>
                  </td>
                  <td className="py-2 text-right text-gray-300">
                    {formatCurrency(trade.price || 0)}
                  </td>
                  <td className="py-2 text-right text-gray-300">
                    {(trade.shares || 0).toLocaleString()}
                  </td>
                  <td className="py-2 text-right text-white">
                    {formatCurrency(trade.totalCost || trade.value || 0)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* 戦略説明 */}
      <div className="bg-gray-700 rounded-lg p-4">
        <h4 className="text-lg font-semibold mb-3">バックテスト戦略</h4>
        <div className="text-sm text-gray-300 space-y-2">
          <p>• <strong>買いシグナル:</strong> RSI &lt; 30 または MACD &gt; Signal</p>
          <p>• <strong>売りシグナル:</strong> RSI &gt; 70 または MACD &lt; Signal</p>
          <p>• <strong>期間:</strong> 過去30日間のデータを使用</p>
          <p>• <strong>手数料:</strong> 取引手数料は考慮していません</p>
          <p>• <strong>注意:</strong> 過去の結果は将来の成果を保証するものではありません</p>
        </div>
      </div>
    </div>
  );
}