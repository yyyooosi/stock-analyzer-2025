'use client';

import { useState } from 'react';

interface IndicatorSnapshot {
  date: string;
  price: number;
  rsi: number;
  macd: number;
  macdSignal: number;
  macdHistogram: number;
  sma5: number;
  sma20: number;
  sma50: number;
  bollingerUpper: number;
  bollingerMiddle: number;
  bollingerLower: number;
  ema12: number;
  ema26: number;
}

interface SimilarPattern {
  date: string;
  similarity: number;
  indicators: IndicatorSnapshot;
  futurePerformance: {
    days: number;
    priceChange: number;
    priceChangePercent: number;
    highestPrice: number;
    lowestPrice: number;
    volatility: number;
  }[];
}

interface PatternAnalysisResult {
  currentIndicators: IndicatorSnapshot;
  similarPatterns: SimilarPattern[];
  prediction: {
    averageReturn1Day: number;
    averageReturn3Day: number;
    averageReturn5Day: number;
    averageReturn7Day: number;
    successRate: number;
    confidence: number;
    volatilityExpectation: number;
  };
  summary: string;
}

interface Props {
  result: PatternAnalysisResult;
  symbol: string;
}

export function HistoricalPatternAnalysis({ result, symbol }: Props) {
  const [expandedPattern, setExpandedPattern] = useState<string | null>(null);

  const { currentIndicators, similarPatterns, prediction, summary } = result;

  const getPredictionColor = (value: number) => {
    if (value >= 3) return 'text-green-400';
    if (value >= 1) return 'text-green-300';
    if (value >= -1) return 'text-yellow-400';
    if (value >= -3) return 'text-orange-400';
    return 'text-red-400';
  };

  const getSuccessRateColor = (rate: number) => {
    if (rate >= 70) return 'text-green-400';
    if (rate >= 50) return 'text-yellow-400';
    return 'text-red-400';
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 70) return 'text-green-400';
    if (confidence >= 50) return 'text-yellow-400';
    return 'text-orange-400';
  };

  const getDirectionIcon = (value: number) => {
    if (value >= 1) return '📈';
    if (value >= 0) return '➡️';
    if (value >= -1) return '📉';
    return '⬇️';
  };

  const getDirectionLabel = (value: number) => {
    if (value >= 2) return '強い上昇';
    if (value >= 0.5) return '上昇';
    if (value >= -0.5) return '横ばい';
    if (value >= -2) return '下落';
    return '強い下落';
  };

  const togglePattern = (date: string) => {
    setExpandedPattern(expandedPattern === date ? null : date);
  };

  return (
    <div className="bg-gray-800 rounded-lg p-6">
      <div className="mb-6">
        <h3 className="text-2xl font-bold mb-2">📊 履歴パターン分析</h3>
        <p className="text-gray-400 text-sm">
          現在の指標と類似する過去のパターンを分析し、将来の株価動向を予測します
        </p>
      </div>

      {/* サマリー */}
      <div className="bg-blue-900/30 border border-blue-700 rounded-lg p-4 mb-6">
        <h4 className="text-lg font-semibold mb-2 text-blue-300">分析サマリー</h4>
        <p className="text-gray-300 whitespace-pre-line">{summary}</p>
      </div>

      {/* 予測方向性 - 大きく目立つ表示 */}
      <div className="bg-gradient-to-r from-gray-700 to-gray-800 rounded-lg p-6 mb-6 border-2 border-gray-600">
        <div className="text-center">
          <h4 className="text-lg font-semibold mb-4 text-gray-300">予測される株価の方向性</h4>
          <div className="flex items-center justify-center gap-6">
            <div className="text-6xl">
              {getDirectionIcon(prediction.averageReturn7Day)}
            </div>
            <div className="text-left">
              <p className={`text-4xl font-bold ${getPredictionColor(prediction.averageReturn7Day)}`}>
                {getDirectionLabel(prediction.averageReturn7Day)}
              </p>
              <p className="text-xl text-gray-400 mt-2">
                7日後の期待リターン:
                <span className={`ml-2 font-semibold ${getPredictionColor(prediction.averageReturn7Day)}`}>
                  {prediction.averageReturn7Day > 0 ? '+' : ''}
                  {prediction.averageReturn7Day.toFixed(2)}%
                </span>
              </p>
              <p className="text-sm text-gray-400 mt-1">
                上昇確率: <span className={getSuccessRateColor(prediction.successRate)}>{prediction.successRate.toFixed(0)}%</span>
                {' '}/ 信頼度: <span className={getConfidenceColor(prediction.confidence)}>{prediction.confidence.toFixed(0)}%</span>
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* 予測指標 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        {/* 成功率 */}
        <div className="bg-gray-700 rounded-lg p-4">
          <h4 className="text-sm text-gray-400 mb-2">上昇確率（7日後）</h4>
          <p className={`text-3xl font-bold ${getSuccessRateColor(prediction.successRate)}`}>
            {prediction.successRate.toFixed(0)}%
          </p>
          <p className="text-xs text-gray-400 mt-2">
            {similarPatterns.length}件中 {Math.round(similarPatterns.length * prediction.successRate / 100)}件が上昇
          </p>
        </div>

        {/* 期待リターン */}
        <div className="bg-gray-700 rounded-lg p-4">
          <h4 className="text-sm text-gray-400 mb-2">期待リターン推移</h4>
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-xs text-gray-400">1日後:</span>
              <span className={`font-semibold ${getPredictionColor(prediction.averageReturn1Day)}`}>
                {getDirectionIcon(prediction.averageReturn1Day)} {prediction.averageReturn1Day > 0 ? '+' : ''}{prediction.averageReturn1Day.toFixed(2)}%
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-xs text-gray-400">3日後:</span>
              <span className={`font-semibold ${getPredictionColor(prediction.averageReturn3Day)}`}>
                {getDirectionIcon(prediction.averageReturn3Day)} {prediction.averageReturn3Day > 0 ? '+' : ''}{prediction.averageReturn3Day.toFixed(2)}%
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-xs text-gray-400">5日後:</span>
              <span className={`font-semibold ${getPredictionColor(prediction.averageReturn5Day)}`}>
                {getDirectionIcon(prediction.averageReturn5Day)} {prediction.averageReturn5Day > 0 ? '+' : ''}{prediction.averageReturn5Day.toFixed(2)}%
              </span>
            </div>
            <div className="flex justify-between items-center border-t border-gray-600 pt-2">
              <span className="text-xs text-gray-400 font-semibold">7日後:</span>
              <span className={`text-lg font-bold ${getPredictionColor(prediction.averageReturn7Day)}`}>
                {getDirectionIcon(prediction.averageReturn7Day)} {prediction.averageReturn7Day > 0 ? '+' : ''}{prediction.averageReturn7Day.toFixed(2)}%
              </span>
            </div>
          </div>
        </div>

        {/* 信頼度 */}
        <div className="bg-gray-700 rounded-lg p-4">
          <h4 className="text-sm text-gray-400 mb-2">分析信頼度</h4>
          <p className={`text-3xl font-bold ${getConfidenceColor(prediction.confidence)}`}>
            {prediction.confidence.toFixed(0)}%
          </p>
          <p className="text-xs text-gray-400 mt-2">
            類似パターン: {similarPatterns.length}件
          </p>
          <p className="text-xs text-gray-400 mt-1">
            期待ボラティリティ: {prediction.volatilityExpectation.toFixed(1)}%
          </p>
        </div>
      </div>

      {/* 現在の指標 */}
      <div className="bg-gray-700 rounded-lg p-4 mb-6">
        <h4 className="text-lg font-semibold mb-3">現在の指標値</h4>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
          <div>
            <span className="text-gray-400">RSI:</span>
            <span className="ml-2 font-semibold">{currentIndicators.rsi.toFixed(2)}</span>
          </div>
          <div>
            <span className="text-gray-400">MACD:</span>
            <span className="ml-2 font-semibold">{currentIndicators.macd.toFixed(2)}</span>
          </div>
          <div>
            <span className="text-gray-400">SMA20:</span>
            <span className="ml-2 font-semibold">${currentIndicators.sma20.toFixed(2)}</span>
          </div>
          <div>
            <span className="text-gray-400">価格:</span>
            <span className="ml-2 font-semibold">${currentIndicators.price.toFixed(2)}</span>
          </div>
        </div>
      </div>

      {/* 類似パターン一覧 */}
      {similarPatterns.length > 0 && (
        <div>
          <h4 className="text-lg font-semibold mb-3">類似パターン（上位{similarPatterns.length}件）</h4>
          <div className="space-y-3">
            {similarPatterns.map((pattern, index) => (
              <div
                key={pattern.date}
                className="bg-gray-700 rounded-lg overflow-hidden"
              >
                <div
                  className="p-4 cursor-pointer hover:bg-gray-600 transition-colors"
                  onClick={() => togglePattern(pattern.date)}
                >
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-4">
                      <span className="text-sm font-semibold text-gray-400">#{index + 1}</span>
                      <div>
                        <p className="font-semibold">{pattern.date}</p>
                        <p className="text-sm text-gray-400">
                          類似度: <span className="text-blue-400">{pattern.similarity.toFixed(1)}%</span>
                        </p>
                      </div>
                    </div>
                    <div className="text-right flex items-center gap-3">
                      {pattern.futurePerformance.length > 0 && (
                        <>
                          {pattern.futurePerformance
                            .filter(p => p.days === 7)
                            .map(perf => (
                              <div key={perf.days} className="flex items-center gap-2">
                                <span className="text-3xl">
                                  {getDirectionIcon(perf.priceChangePercent)}
                                </span>
                                <div>
                                  <p className={`text-sm font-semibold ${getPredictionColor(perf.priceChangePercent)}`}>
                                    {getDirectionLabel(perf.priceChangePercent)}
                                  </p>
                                  <p className={`text-2xl font-bold ${getPredictionColor(perf.priceChangePercent)}`}>
                                    {perf.priceChangePercent > 0 ? '+' : ''}
                                    {perf.priceChangePercent.toFixed(2)}%
                                  </p>
                                  <p className="text-xs text-gray-400">7日後</p>
                                </div>
                              </div>
                            ))}
                        </>
                      )}
                    </div>
                  </div>
                </div>

                {/* 展開された詳細情報 */}
                {expandedPattern === pattern.date && (
                  <div className="border-t border-gray-600 p-4 bg-gray-750">
                    {/* 指標値 */}
                    <div className="mb-4">
                      <h5 className="text-sm font-semibold mb-2 text-gray-300">当時の指標値</h5>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
                        <div>
                          <span className="text-gray-400">価格:</span>
                          <span className="ml-1">${pattern.indicators.price.toFixed(2)}</span>
                        </div>
                        <div>
                          <span className="text-gray-400">RSI:</span>
                          <span className="ml-1">{pattern.indicators.rsi.toFixed(2)}</span>
                        </div>
                        <div>
                          <span className="text-gray-400">MACD:</span>
                          <span className="ml-1">{pattern.indicators.macd.toFixed(2)}</span>
                        </div>
                        <div>
                          <span className="text-gray-400">Histogram:</span>
                          <span className="ml-1">{pattern.indicators.macdHistogram.toFixed(2)}</span>
                        </div>
                        <div>
                          <span className="text-gray-400">SMA5:</span>
                          <span className="ml-1">${pattern.indicators.sma5.toFixed(2)}</span>
                        </div>
                        <div>
                          <span className="text-gray-400">SMA20:</span>
                          <span className="ml-1">${pattern.indicators.sma20.toFixed(2)}</span>
                        </div>
                        <div>
                          <span className="text-gray-400">SMA50:</span>
                          <span className="ml-1">${pattern.indicators.sma50.toFixed(2)}</span>
                        </div>
                        <div>
                          <span className="text-gray-400">EMA12:</span>
                          <span className="ml-1">${pattern.indicators.ema12.toFixed(2)}</span>
                        </div>
                      </div>
                    </div>

                    {/* 将来のパフォーマンス */}
                    {pattern.futurePerformance.length > 0 && (
                      <div>
                        <h5 className="text-sm font-semibold mb-3 text-gray-300">📈 その後の株価推移 - どう動いたか</h5>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          {pattern.futurePerformance.map((perf) => (
                            <div
                              key={perf.days}
                              className={`rounded p-3 border-2 ${
                                perf.priceChangePercent >= 1
                                  ? 'bg-green-900/20 border-green-600/50'
                                  : perf.priceChangePercent >= 0
                                  ? 'bg-gray-800 border-gray-600'
                                  : perf.priceChangePercent >= -1
                                  ? 'bg-orange-900/20 border-orange-600/50'
                                  : 'bg-red-900/20 border-red-600/50'
                              }`}
                            >
                              <div className="flex items-center justify-between mb-2">
                                <p className="text-xs text-gray-400 font-semibold">{perf.days}日後の結果</p>
                                <div className="flex items-center gap-1">
                                  <span className="text-xl">
                                    {getDirectionIcon(perf.priceChangePercent)}
                                  </span>
                                  <span className={`text-xs font-semibold ${getPredictionColor(perf.priceChangePercent)}`}>
                                    {getDirectionLabel(perf.priceChangePercent)}
                                  </span>
                                </div>
                              </div>
                              <div className="mb-2">
                                <span className={`text-lg font-bold ${getPredictionColor(perf.priceChangePercent)}`}>
                                  {perf.priceChangePercent > 0 ? '+' : ''}
                                  {perf.priceChangePercent.toFixed(2)}%
                                </span>
                                <span className="text-xs text-gray-400 ml-2">
                                  (${perf.priceChange > 0 ? '+' : ''}{perf.priceChange.toFixed(2)})
                                </span>
                              </div>
                              <div className="grid grid-cols-2 gap-2 text-xs pt-2 border-t border-gray-600">
                                <div>
                                  <span className="text-gray-400">最高値:</span>
                                  <span className="ml-1 text-green-400">${perf.highestPrice.toFixed(2)}</span>
                                </div>
                                <div>
                                  <span className="text-gray-400">最安値:</span>
                                  <span className="ml-1 text-red-400">${perf.lowestPrice.toFixed(2)}</span>
                                </div>
                                <div className="col-span-2">
                                  <span className="text-gray-400">変動幅:</span>
                                  <span className="ml-1">{perf.volatility.toFixed(2)}%</span>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {similarPatterns.length === 0 && (
        <div className="text-center py-8 text-gray-400">
          <p>類似するパターンが見つかりませんでした。</p>
          <p className="text-sm mt-2">データ期間が不足しているか、現在の市場状況が独特である可能性があります。</p>
        </div>
      )}
    </div>
  );
}
