'use client';

import React, { useState } from 'react';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

interface Trade {
  date: string;
  type: 'BUY' | 'SELL';
  price: number;
  signal: string;
  confidence: number;
  shares: number;
  value: number;
}

interface BacktestResult {
  trades: Trade[];
  performance: {
    totalReturn: number;
    annualizedReturn: number;
    winRate: number;
    totalTrades: number;
    winningTrades: number;
    losingTrades: number;
    averageWin: number;
    averageLoss: number;
    maxDrawdown: number;
    sharpeRatio: number;
    finalValue: number;
    buyAndHoldReturn: number;
  };
  portfolioValue: Array<{
    date: string;
    value: number;
    buyAndHoldValue: number;
  }>;
}

interface BacktestResultsProps {
  result: BacktestResult;
  symbol: string;
  initialCapital: number;
}

export const BacktestResults: React.FC<BacktestResultsProps> = ({ 
  result, 
  symbol, 
  initialCapital 
}) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'trades' | 'chart'>('overview');

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount);
  };

  const formatPercent = (percent: number) => {
    return `${percent >= 0 ? '+' : ''}${(percent * 100).toFixed(2)}%`;
  };

  const getPerformanceColor = (value: number) => {
    return value >= 0 ? 'text-green-400' : 'text-red-400';
  };

  // チャートデータの準備
  const chartData = {
    labels: result.portfolioValue.map(pv => {
      const date = new Date(pv.date);
      return `${date.getMonth() + 1}/${date.getDate()}`;
    }),
    datasets: [
      {
        label: 'シグナル戦略',
        data: result.portfolioValue.map(pv => pv.value),
        borderColor: 'rgb(59, 130, 246)',
        backgroundColor: 'rgba(59, 130, 246, 0.1)',
        borderWidth: 2,
        fill: false,
        tension: 0.1,
      },
      {
        label: 'Buy & Hold',
        data: result.portfolioValue.map(pv => pv.buyAndHoldValue),
        borderColor: 'rgb(156, 163, 175)',
        backgroundColor: 'rgba(156, 163, 175, 0.1)',
        borderWidth: 2,
        fill: false,
        tension: 0.1,
        borderDash: [5, 5],
      }
    ],
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top' as const,
        labels: {
          color: 'rgb(156, 163, 175)',
        }
      },
      title: {
        display: true,
        text: `${symbol} - パフォーマンス比較`,
        color: 'white',
        font: {
          size: 16
        }
      },
      tooltip: {
        backgroundColor: 'rgba(17, 24, 39, 0.9)',
        titleColor: 'white',
        bodyColor: 'white',
        borderColor: 'rgb(75, 85, 99)',
        borderWidth: 1,
        callbacks: {
          label: function(context: { dataset: { label?: string }; parsed: { y: number } }) {
            const label = context.dataset.label || '';
            const value = context.parsed.y;
            return `${label}: ${formatCurrency(value)}`;
          }
        }
      }
    },
    scales: {
      x: {
        display: true,
        title: {
          display: true,
          text: '日付',
          color: 'rgb(156, 163, 175)',
        },
        ticks: {
          color: 'rgb(156, 163, 175)',
        },
        grid: {
          color: 'rgba(75, 85, 99, 0.3)',
        }
      },
      y: {
        display: true,
        title: {
          display: true,
          text: 'ポートフォリオ価値 (USD)',
          color: 'rgb(156, 163, 175)',
        },
        ticks: {
          color: 'rgb(156, 163, 175)',
          callback: function(value: string | number) {
            return formatCurrency(Number(value));
          }
        },
        grid: {
          color: 'rgba(75, 85, 99, 0.3)',
        }
      },
    },
  };

  return (
    <div className="bg-gray-800 p-6 rounded-lg">
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-xl font-bold">📈 バックテスト結果</h3>
        <div className="text-sm text-gray-400">
          期間: {result.portfolioValue[0]?.date} ～ {result.portfolioValue[result.portfolioValue.length - 1]?.date}
        </div>
      </div>

      {/* タブナビゲーション */}
      <div className="flex space-x-4 mb-6 border-b border-gray-700">
        <button
          onClick={() => setActiveTab('overview')}
          className={`pb-2 px-1 border-b-2 transition-colors ${
            activeTab === 'overview'
              ? 'border-blue-500 text-blue-400'
              : 'border-transparent text-gray-400 hover:text-gray-300'
          }`}
        >
          概要
        </button>
        <button
          onClick={() => setActiveTab('chart')}
          className={`pb-2 px-1 border-b-2 transition-colors ${
            activeTab === 'chart'
              ? 'border-blue-500 text-blue-400'
              : 'border-transparent text-gray-400 hover:text-gray-300'
          }`}
        >
          チャート
        </button>
        <button
          onClick={() => setActiveTab('trades')}
          className={`pb-2 px-1 border-b-2 transition-colors ${
            activeTab === 'trades'
              ? 'border-blue-500 text-blue-400'
              : 'border-transparent text-gray-400 hover:text-gray-300'
          }`}
        >
          取引履歴
        </button>
      </div>

      {/* 概要タブ */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* 主要指標 */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-gray-700 p-4 rounded-lg text-center">
              <h4 className="text-sm text-gray-400 mb-1">総リターン</h4>
              <div className={`text-xl font-bold ${getPerformanceColor(result.performance.totalReturn)}`}>
                {formatPercent(result.performance.totalReturn)}
              </div>
            </div>
            
            <div className="bg-gray-700 p-4 rounded-lg text-center">
              <h4 className="text-sm text-gray-400 mb-1">年間リターン</h4>
              <div className={`text-xl font-bold ${getPerformanceColor(result.performance.annualizedReturn)}`}>
                {formatPercent(result.performance.annualizedReturn)}
              </div>
            </div>
            
            <div className="bg-gray-700 p-4 rounded-lg text-center">
              <h4 className="text-sm text-gray-400 mb-1">勝率</h4>
              <div className="text-xl font-bold text-blue-400">
                {formatPercent(result.performance.winRate)}
              </div>
            </div>
            
            <div className="bg-gray-700 p-4 rounded-lg text-center">
              <h4 className="text-sm text-gray-400 mb-1">シャープレシオ</h4>
              <div className="text-xl font-bold text-purple-400">
                {result.performance.sharpeRatio.toFixed(2)}
              </div>
            </div>
          </div>

          {/* 戦略比較 */}
          <div className="bg-gray-700 p-6 rounded-lg">
            <h4 className="text-lg font-semibold mb-4">戦略比較</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h5 className="font-semibold text-blue-300 mb-3">シグナル戦略</h5>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-400">開始資金:</span>
                    <span>{formatCurrency(initialCapital)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">最終価値:</span>
                    <span className={getPerformanceColor(result.performance.finalValue - initialCapital)}>
                      {formatCurrency(result.performance.finalValue)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">総利益:</span>
                    <span className={getPerformanceColor(result.performance.finalValue - initialCapital)}>
                      {formatCurrency(result.performance.finalValue - initialCapital)}
                    </span>
                  </div>
                </div>
              </div>
              
              <div>
                <h5 className="font-semibold text-gray-300 mb-3">Buy & Hold戦略</h5>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-400">開始資金:</span>
                    <span>{formatCurrency(initialCapital)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">最終価値:</span>
                    <span className={getPerformanceColor(result.performance.buyAndHoldReturn)}>
                      {formatCurrency(initialCapital * (1 + result.performance.buyAndHoldReturn))}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">総利益:</span>
                    <span className={getPerformanceColor(result.performance.buyAndHoldReturn)}>
                      {formatCurrency(initialCapital * result.performance.buyAndHoldReturn)}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* 詳細統計 */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-gray-700 p-4 rounded-lg">
              <h5 className="font-semibold mb-3">取引統計</h5>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-400">総取引数:</span>
                  <span>{result.performance.totalTrades}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">勝ち取引:</span>
                  <span className="text-green-400">{result.performance.winningTrades}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">負け取引:</span>
                  <span className="text-red-400">{result.performance.losingTrades}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">平均勝ち:</span>
                  <span className="text-green-400">{formatCurrency(result.performance.averageWin)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">平均負け:</span>
                  <span className="text-red-400">{formatCurrency(result.performance.averageLoss)}</span>
                </div>
              </div>
            </div>
            
            <div className="bg-gray-700 p-4 rounded-lg">
              <h5 className="font-semibold mb-3">リスク指標</h5>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-400">最大ドローダウン:</span>
                  <span className="text-red-400">{formatPercent(result.performance.maxDrawdown)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">リスク調整リターン:</span>
                  <span className="text-purple-400">{result.performance.sharpeRatio.toFixed(3)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* チャートタブ */}
      {activeTab === 'chart' && (
        <div className="h-96">
          <Line data={chartData} options={chartOptions} />
        </div>
      )}

      {/* 取引履歴タブ */}
      {activeTab === 'trades' && (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-700">
                <th className="text-left p-2">日付</th>
                <th className="text-center p-2">種類</th>
                <th className="text-right p-2">価格</th>
                <th className="text-center p-2">シグナル</th>
                <th className="text-right p-2">信頼度</th>
                <th className="text-right p-2">株数</th>
                <th className="text-right p-2">金額</th>
              </tr>
            </thead>
            <tbody>
              {result.trades.map((trade, index) => (
                <tr key={index} className="border-b border-gray-700">
                  <td className="p-2">{trade.date}</td>
                  <td className="text-center p-2">
                    <span className={`px-2 py-1 rounded text-xs font-semibold ${
                      trade.type === 'BUY' 
                        ? 'bg-green-900 text-green-300' 
                        : 'bg-red-900 text-red-300'
                    }`}>
                      {trade.type}
                    </span>
                  </td>
                  <td className="text-right p-2">{formatCurrency(trade.price)}</td>
                  <td className="text-center p-2">
                    <span className="text-xs text-gray-400">{trade.signal}</span>
                  </td>
                  <td className="text-right p-2">{trade.confidence}%</td>
                  <td className="text-right p-2">{trade.shares.toLocaleString()}</td>
                  <td className="text-right p-2">{formatCurrency(trade.value)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};