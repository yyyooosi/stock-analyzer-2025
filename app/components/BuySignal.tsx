'use client';

import { SignalAnalysis } from '../utils/signalAnalysis';

interface BuySignalProps {
  analysis: SignalAnalysis;
  symbol: string;
}

export function BuySignal({ analysis, symbol }: BuySignalProps) {
  const getSignalColor = (signal: string) => {
    if (signal === 'BUY') return 'text-green-400 bg-green-900/30 border-green-400';
    if (signal === 'SELL') return 'text-red-400 bg-red-900/30 border-red-400';
    return 'text-yellow-400 bg-yellow-900/30 border-yellow-400';
  };

  const getSignalLabel = (signal: string) => {
    if (signal === 'BUY') return '買い推奨';
    if (signal === 'SELL') return '売り推奨';
    return '様子見';
  };

  return (
    <div className="bg-gray-800 rounded-lg p-6">
      <h3 className="text-xl font-bold mb-4">{symbol} - シグナル分析</h3>

      {/* メインシグナル */}
      <div className={`rounded-lg p-4 border-2 mb-6 ${getSignalColor(analysis.signal)}`}>
        <div className="flex justify-between items-center">
          <div>
            <p className="text-sm text-gray-300 mb-1">総合シグナル</p>
            <p className="text-3xl font-bold">{getSignalLabel(analysis.signal)}</p>
          </div>
          <div className="text-right">
            <p className="text-sm text-gray-300 mb-1">信頼度</p>
            <p className="text-2xl font-bold">{analysis.confidence}%</p>
          </div>
        </div>
      </div>

      {/* 推奨アクション */}
      <div className="bg-gray-700 rounded-lg p-4 mb-4">
        <h4 className="text-lg font-semibold mb-2">推奨アクション</h4>
        <p className="text-gray-300">{analysis.recommendation}</p>
      </div>

      {/* 各指標の分析 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-gray-700 rounded-lg p-4">
          <h4 className="text-sm font-semibold mb-2 text-gray-400">RSI</h4>
          <p className="text-sm text-gray-300">{analysis.signals.rsi.reason}</p>
          <div className="mt-2 flex items-center">
            <span className={`text-lg font-bold ${analysis.signals.rsi.score > 0 ? 'text-green-400' : analysis.signals.rsi.score < 0 ? 'text-red-400' : 'text-gray-400'}`}>
              {analysis.signals.rsi.score > 0 ? '+' : ''}{analysis.signals.rsi.score}
            </span>
          </div>
        </div>

        <div className="bg-gray-700 rounded-lg p-4">
          <h4 className="text-sm font-semibold mb-2 text-gray-400">MACD</h4>
          <p className="text-sm text-gray-300">{analysis.signals.macd.reason}</p>
          <div className="mt-2 flex items-center">
            <span className={`text-lg font-bold ${analysis.signals.macd.score > 0 ? 'text-green-400' : analysis.signals.macd.score < 0 ? 'text-red-400' : 'text-gray-400'}`}>
              {analysis.signals.macd.score > 0 ? '+' : ''}{analysis.signals.macd.score}
            </span>
          </div>
        </div>

        <div className="bg-gray-700 rounded-lg p-4">
          <h4 className="text-sm font-semibold mb-2 text-gray-400">移動平均</h4>
          <p className="text-sm text-gray-300">{analysis.signals.movingAverage.reason}</p>
          <div className="mt-2 flex items-center">
            <span className={`text-lg font-bold ${analysis.signals.movingAverage.score > 0 ? 'text-green-400' : analysis.signals.movingAverage.score < 0 ? 'text-red-400' : 'text-gray-400'}`}>
              {analysis.signals.movingAverage.score > 0 ? '+' : ''}{analysis.signals.movingAverage.score}
            </span>
          </div>
        </div>

        <div className="bg-gray-700 rounded-lg p-4">
          <h4 className="text-sm font-semibold mb-2 text-gray-400">ボリンジャーバンド</h4>
          <p className="text-sm text-gray-300">{analysis.signals.bollingerBands.reason}</p>
          <div className="mt-2 flex items-center">
            <span className={`text-lg font-bold ${analysis.signals.bollingerBands.score > 0 ? 'text-green-400' : analysis.signals.bollingerBands.score < 0 ? 'text-red-400' : 'text-gray-400'}`}>
              {analysis.signals.bollingerBands.score > 0 ? '+' : ''}{analysis.signals.bollingerBands.score}
            </span>
          </div>
        </div>
      </div>

      {/* 理由リスト */}
      <div className="mt-6 bg-gray-700 rounded-lg p-4">
        <h4 className="text-lg font-semibold mb-3">分析理由</h4>
        <ul className="space-y-2">
          {analysis.reasons.map((reason, index) => (
            <li key={index} className="text-sm text-gray-300 flex items-start">
              <span className="mr-2">•</span>
              <span>{reason}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
