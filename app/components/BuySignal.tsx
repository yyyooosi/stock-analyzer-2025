'use client';

import React from 'react';
import { SignalAnalysis } from '../utils/signalAnalysis';

interface BuySignalProps {
  analysis: SignalAnalysis;
  symbol: string;
}

export const BuySignal: React.FC<BuySignalProps> = ({ analysis, symbol }) => {
  const getSignalColor = (signal: SignalAnalysis['signal']) => {
    switch (signal) {
      case 'STRONG_BUY': return 'text-green-400 bg-green-900';
      case 'BUY': return 'text-green-300 bg-green-800';
      case 'HOLD': return 'text-yellow-300 bg-yellow-800';
      case 'SELL': return 'text-red-300 bg-red-800';
      case 'STRONG_SELL': return 'text-red-400 bg-red-900';
    }
  };

  const getSignalText = (signal: SignalAnalysis['signal']) => {
    switch (signal) {
      case 'STRONG_BUY': return '強い買い';
      case 'BUY': return '買い';
      case 'HOLD': return '保留';
      case 'SELL': return '売り';
      case 'STRONG_SELL': return '強い売り';
    }
  };

  const getRiskColor = (risk: SignalAnalysis['riskLevel']) => {
    switch (risk) {
      case 'LOW': return 'text-green-400';
      case 'MEDIUM': return 'text-yellow-400';
      case 'HIGH': return 'text-red-400';
    }
  };

  const getRiskText = (risk: SignalAnalysis['riskLevel']) => {
    switch (risk) {
      case 'LOW': return '低リスク';
      case 'MEDIUM': return '中リスク';
      case 'HIGH': return '高リスク';
    }
  };

  const getScoreBarColor = (score: number) => {
    if (score >= 15) return 'bg-green-500';
    if (score >= 5) return 'bg-green-400';
    if (score >= -5) return 'bg-yellow-400';
    if (score >= -15) return 'bg-red-400';
    return 'bg-red-500';
  };

  const getScoreBarWidth = (score: number) => {
    const normalizedScore = Math.max(-25, Math.min(25, score));
    return Math.abs(normalizedScore) * 2; // -25~25 を 0~50% に変換
  };

  const getIndividualScoreColor = (score: number) => {
    if (score >= 10) return 'text-green-400';
    if (score >= 3) return 'text-green-300';
    if (score >= -3) return 'text-yellow-300';
    if (score >= -10) return 'text-red-300';
    return 'text-red-400';
  };

  return (
    <div className="bg-gray-800 p-6 rounded-lg">
      <h3 className="text-xl font-bold mb-6">🎯 総合買い時シグナル分析</h3>
      
      {/* メインシグナル表示 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        {/* 総合判定 */}
        <div className="bg-gray-700 p-6 rounded-lg text-center">
          <h4 className="text-lg font-semibold mb-3">{symbol} 総合判定</h4>
          <div className={`inline-block px-6 py-3 rounded-lg font-bold text-xl ${getSignalColor(analysis.signal)}`}>
            {getSignalText(analysis.signal)}
          </div>
          <div className="mt-3">
            <span className="text-gray-400">総合スコア: </span>
            <span className={`font-bold text-lg ${analysis.overallScore >= 0 ? 'text-green-400' : 'text-red-400'}`}>
              {analysis.overallScore >= 0 ? '+' : ''}{analysis.overallScore.toFixed(1)}
            </span>
          </div>
        </div>

        {/* 信頼度 */}
        <div className="bg-gray-700 p-6 rounded-lg text-center">
          <h4 className="text-lg font-semibold mb-3">信頼度</h4>
          <div className="text-3xl font-bold mb-2">
            {analysis.confidence}%
          </div>
          <div className="w-full bg-gray-600 rounded-full h-3">
            <div 
              className={`h-3 rounded-full ${analysis.confidence >= 70 ? 'bg-green-500' : analysis.confidence >= 50 ? 'bg-yellow-500' : 'bg-red-500'}`}
              style={{ width: `${analysis.confidence}%` }}
            ></div>
          </div>
        </div>

        {/* リスクレベル */}
        <div className="bg-gray-700 p-6 rounded-lg text-center">
          <h4 className="text-lg font-semibold mb-3">リスクレベル</h4>
          <div className={`text-2xl font-bold ${getRiskColor(analysis.riskLevel)}`}>
            {getRiskText(analysis.riskLevel)}
          </div>
          <div className="mt-2 text-sm text-gray-400">
            投資時のリスク評価
          </div>
        </div>
      </div>

      {/* 個別指標スコア */}
      <div className="mb-8">
        <h4 className="text-lg font-semibold mb-4">📊 個別指標スコア</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-gray-700 p-4 rounded-lg">
            <div className="flex justify-between items-center mb-2">
              <span className="font-semibold">RSI</span>
              <span className={`font-bold ${getIndividualScoreColor(analysis.individualScores.rsi)}`}>
                {analysis.individualScores.rsi >= 0 ? '+' : ''}{analysis.individualScores.rsi}
              </span>
            </div>
            <div className="w-full bg-gray-600 rounded-full h-2">
              <div 
                className={`h-2 rounded-full ${getScoreBarColor(analysis.individualScores.rsi)}`}
                style={{ 
                  width: `${getScoreBarWidth(analysis.individualScores.rsi)}%`,
                  marginLeft: analysis.individualScores.rsi < 0 ? `${50 - getScoreBarWidth(analysis.individualScores.rsi)}%` : '50%'
                }}
              ></div>
            </div>
          </div>

          <div className="bg-gray-700 p-4 rounded-lg">
            <div className="flex justify-between items-center mb-2">
              <span className="font-semibold">MACD</span>
              <span className={`font-bold ${getIndividualScoreColor(analysis.individualScores.macd)}`}>
                {analysis.individualScores.macd >= 0 ? '+' : ''}{analysis.individualScores.macd}
              </span>
            </div>
            <div className="w-full bg-gray-600 rounded-full h-2">
              <div 
                className={`h-2 rounded-full ${getScoreBarColor(analysis.individualScores.macd)}`}
                style={{ 
                  width: `${getScoreBarWidth(analysis.individualScores.macd)}%`,
                  marginLeft: analysis.individualScores.macd < 0 ? `${50 - getScoreBarWidth(analysis.individualScores.macd)}%` : '50%'
                }}
              ></div>
            </div>
          </div>

          <div className="bg-gray-700 p-4 rounded-lg">
            <div className="flex justify-between items-center mb-2">
              <span className="font-semibold">移動平均</span>
              <span className={`font-bold ${getIndividualScoreColor(analysis.individualScores.movingAverage)}`}>
                {analysis.individualScores.movingAverage >= 0 ? '+' : ''}{analysis.individualScores.movingAverage}
              </span>
            </div>
            <div className="w-full bg-gray-600 rounded-full h-2">
              <div 
                className={`h-2 rounded-full ${getScoreBarColor(analysis.individualScores.movingAverage)}`}
                style={{ 
                  width: `${getScoreBarWidth(analysis.individualScores.movingAverage)}%`,
                  marginLeft: analysis.individualScores.movingAverage < 0 ? `${50 - getScoreBarWidth(analysis.individualScores.movingAverage)}%` : '50%'
                }}
              ></div>
            </div>
          </div>

          <div className="bg-gray-700 p-4 rounded-lg">
            <div className="flex justify-between items-center mb-2">
              <span className="font-semibold">ボリンジャー</span>
              <span className={`font-bold ${getIndividualScoreColor(analysis.individualScores.bollingerBands)}`}>
                {analysis.individualScores.bollingerBands >= 0 ? '+' : ''}{analysis.individualScores.bollingerBands}
              </span>
            </div>
            <div className="w-full bg-gray-600 rounded-full h-2">
              <div 
                className={`h-2 rounded-full ${getScoreBarColor(analysis.individualScores.bollingerBands)}`}
                style={{ 
                  width: `${getScoreBarWidth(analysis.individualScores.bollingerBands)}%`,
                  marginLeft: analysis.individualScores.bollingerBands < 0 ? `${50 - getScoreBarWidth(analysis.individualScores.bollingerBands)}%` : '50%'
                }}
              ></div>
            </div>
          </div>
        </div>
      </div>

      {/* 判定理由 */}
      <div className="mb-6">
        <h4 className="text-lg font-semibold mb-4">📋 判定理由</h4>
        <div className="bg-gray-700 p-4 rounded-lg">
          <ul className="space-y-2">
            {analysis.reasons.map((reason, index) => (
              <li key={index} className="flex items-start">
                <span className="text-blue-400 mr-2">•</span>
                <span className="text-gray-300">{reason}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* 推奨アクション */}
      <div className="bg-gradient-to-r from-blue-900 to-purple-900 p-6 rounded-lg">
        <h4 className="text-lg font-semibold mb-3">💡 推奨アクション</h4>
        <p className="text-gray-200 leading-relaxed">
          {analysis.recommendation}
        </p>
        <div className="mt-4 text-sm text-gray-400">
          ⚠️ 投資判断は自己責任で行ってください。このシグナルは参考情報であり、投資助言ではありません。
        </div>
      </div>
    </div>
  );
};