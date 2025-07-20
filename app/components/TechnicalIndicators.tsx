'use client';

import React from 'react';

interface LatestIndicators {
  rsi: number | null;
  macd: {
    macd: number | null;
    signal: number | null;
    histogram: number | null;
  };
  sma: {
    sma5: number | null;
    sma20: number | null;
    sma50: number | null;
  };
  ema: {
    ema12: number | null;
    ema26: number | null;
  };
  bollingerBands: {
    upper: number | null;
    middle: number | null;
    lower: number | null;
  };
}

interface TechnicalIndicatorsProps {
  indicators: LatestIndicators;
  currentPrice: number;
}

export const TechnicalIndicators: React.FC<TechnicalIndicatorsProps> = ({ 
  indicators, 
  currentPrice 
}) => {
  const formatNumber = (num: number | null, decimals: number = 2): string => {
    if (num === null) return 'N/A';
    return num.toFixed(decimals);
  };

  const formatPrice = (price: number | null): string => {
    if (price === null) return 'N/A';
    return `$${price.toFixed(2)}`;
  };

  const getRSISignal = (rsi: number | null) => {
    if (rsi === null) return { text: 'N/A', color: 'text-gray-400' };
    if (rsi > 70) return { text: '売られすぎ', color: 'text-red-400' };
    if (rsi < 30) return { text: '買われすぎ', color: 'text-green-400' };
    return { text: 'ニュートラル', color: 'text-yellow-400' };
  };

  const getMACDSignal = (macd: number | null, signal: number | null) => {
    if (macd === null || signal === null) return { text: 'N/A', color: 'text-gray-400' };
    if (macd > signal) return { text: '買いシグナル', color: 'text-green-400' };
    return { text: '売りシグナル', color: 'text-red-400' };
  };

  const getMovingAverageSignal = (sma5: number | null, sma20: number | null) => {
    if (sma5 === null || sma20 === null) return { text: 'N/A', color: 'text-gray-400' };
    if (sma5 > sma20) return { text: '上昇トレンド', color: 'text-green-400' };
    return { text: '下降トレンド', color: 'text-red-400' };
  };

  const getBollingerSignal = (upper: number | null, lower: number | null) => {
    if (upper === null || lower === null) return { text: 'N/A', color: 'text-gray-400' };
    if (currentPrice >= upper) return { text: '買われすぎ', color: 'text-red-400' };
    if (currentPrice <= lower) return { text: '売られすぎ', color: 'text-green-400' };
    return { text: 'ニュートラル', color: 'text-yellow-400' };
  };

  const rsiSignal = getRSISignal(indicators.rsi);
  const macdSignal = getMACDSignal(indicators.macd.macd, indicators.macd.signal);
  const maSignal = getMovingAverageSignal(indicators.sma.sma5, indicators.sma.sma20);
  const bbSignal = getBollingerSignal(indicators.bollingerBands.upper, indicators.bollingerBands.lower);

  return (
    <div className="bg-gray-800 p-6 rounded-lg">
      <h3 className="text-xl font-bold mb-6">テクニカル指標分析</h3>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* RSI */}
        <div className="bg-gray-700 p-4 rounded-lg">
          <div className="flex justify-between items-center mb-2">
            <h4 className="font-semibold text-blue-300">RSI (14日)</h4>
            <span className={`font-bold ${rsiSignal.color}`}>
              {rsiSignal.text}
            </span>
          </div>
          <div className="text-2xl font-bold mb-2">
            {formatNumber(indicators.rsi)}
          </div>
          <div className="text-sm text-gray-400">
            30以下: 買われすぎ | 70以上: 売られすぎ
          </div>
        </div>

        {/* MACD */}
        <div className="bg-gray-700 p-4 rounded-lg">
          <div className="flex justify-between items-center mb-2">
            <h4 className="font-semibold text-green-300">MACD</h4>
            <span className={`font-bold ${macdSignal.color}`}>
              {macdSignal.text}
            </span>
          </div>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div>
              <span className="text-gray-400">MACD: </span>
              <span className="font-semibold">{formatNumber(indicators.macd.macd, 4)}</span>
            </div>
            <div>
              <span className="text-gray-400">Signal: </span>
              <span className="font-semibold">{formatNumber(indicators.macd.signal, 4)}</span>
            </div>
            <div className="col-span-2">
              <span className="text-gray-400">Histogram: </span>
              <span className="font-semibold">{formatNumber(indicators.macd.histogram, 4)}</span>
            </div>
          </div>
        </div>

        {/* 移動平均線 */}
        <div className="bg-gray-700 p-4 rounded-lg">
          <div className="flex justify-between items-center mb-2">
            <h4 className="font-semibold text-yellow-300">移動平均線</h4>
            <span className={`font-bold ${maSignal.color}`}>
              {maSignal.text}
            </span>
          </div>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div>
              <span className="text-gray-400">SMA 5: </span>
              <span className="font-semibold">{formatPrice(indicators.sma.sma5)}</span>
            </div>
            <div>
              <span className="text-gray-400">SMA 20: </span>
              <span className="font-semibold">{formatPrice(indicators.sma.sma20)}</span>
            </div>
            <div>
              <span className="text-gray-400">SMA 50: </span>
              <span className="font-semibold">{formatPrice(indicators.sma.sma50)}</span>
            </div>
            <div>
              <span className="text-gray-400">現在価格: </span>
              <span className="font-semibold">{formatPrice(currentPrice)}</span>
            </div>
          </div>
        </div>

        {/* ボリンジャーバンド */}
        <div className="bg-gray-700 p-4 rounded-lg">
          <div className="flex justify-between items-center mb-2">
            <h4 className="font-semibold text-purple-300">ボリンジャーバンド</h4>
            <span className={`font-bold ${bbSignal.color}`}>
              {bbSignal.text}
            </span>
          </div>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div>
              <span className="text-gray-400">上限: </span>
              <span className="font-semibold">{formatPrice(indicators.bollingerBands.upper)}</span>
            </div>
            <div>
              <span className="text-gray-400">中央: </span>
              <span className="font-semibold">{formatPrice(indicators.bollingerBands.middle)}</span>
            </div>
            <div>
              <span className="text-gray-400">下限: </span>
              <span className="font-semibold">{formatPrice(indicators.bollingerBands.lower)}</span>
            </div>
            <div>
              <span className="text-gray-400">現在価格: </span>
              <span className="font-semibold">{formatPrice(currentPrice)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* EMA情報 */}
      <div className="mt-6 bg-gray-700 p-4 rounded-lg">
        <h4 className="font-semibold text-indigo-300 mb-3">指数移動平均 (EMA)</h4>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-gray-400">EMA 12: </span>
            <span className="font-semibold">{formatPrice(indicators.ema.ema12)}</span>
          </div>
          <div>
            <span className="text-gray-400">EMA 26: </span>
            <span className="font-semibold">{formatPrice(indicators.ema.ema26)}</span>
          </div>
        </div>
      </div>
    </div>
  );
};