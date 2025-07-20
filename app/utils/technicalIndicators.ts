interface PriceData {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

interface TechnicalIndicators {
  rsi: number[];
  macd: {
    macd: number[];
    signal: number[];
    histogram: number[];
  };
  sma: {
    sma5: number[];
    sma20: number[];
    sma50: number[];
  };
  ema: {
    ema12: number[];
    ema26: number[];
  };
  bollingerBands: {
    upper: number[];
    middle: number[];
    lower: number[];
  };
}

// 簡易移動平均（SMA）計算
export function calculateSMA(data: number[], period: number): number[] {
  const sma: number[] = [];
  
  for (let i = 0; i < data.length; i++) {
    if (i < period - 1) {
      sma.push(NaN);
    } else {
      const sum = data.slice(i - period + 1, i + 1).reduce((a, b) => a + b, 0);
      sma.push(sum / period);
    }
  }
  
  return sma;
}

// 指数移動平均（EMA）計算
export function calculateEMA(data: number[], period: number): number[] {
  const ema: number[] = [];
  const multiplier = 2 / (period + 1);
  
  for (let i = 0; i < data.length; i++) {
    if (i === 0) {
      ema.push(data[i]);
    } else {
      ema.push((data[i] * multiplier) + (ema[i - 1] * (1 - multiplier)));
    }
  }
  
  return ema;
}

// RSI（相対力指数）計算
export function calculateRSI(data: number[], period: number = 14): number[] {
  const rsi: number[] = [];
  const gains: number[] = [];
  const losses: number[] = [];
  
  // 価格変動を計算
  for (let i = 1; i < data.length; i++) {
    const change = data[i] - data[i - 1];
    gains.push(change > 0 ? change : 0);
    losses.push(change < 0 ? Math.abs(change) : 0);
  }
  
  // RSI計算
  for (let i = 0; i < data.length; i++) {
    if (i < period) {
      rsi.push(NaN);
    } else {
      const avgGain = gains.slice(i - period, i).reduce((a, b) => a + b, 0) / period;
      const avgLoss = losses.slice(i - period, i).reduce((a, b) => a + b, 0) / period;
      
      if (avgLoss === 0) {
        rsi.push(100);
      } else {
        const rs = avgGain / avgLoss;
        rsi.push(100 - (100 / (1 + rs)));
      }
    }
  }
  
  return rsi;
}

// MACD計算
export function calculateMACD(data: number[], fastPeriod: number = 12, slowPeriod: number = 26, signalPeriod: number = 9) {
  const emaFast = calculateEMA(data, fastPeriod);
  const emaSlow = calculateEMA(data, slowPeriod);
  const macd: number[] = [];
  
  // MACD線計算
  for (let i = 0; i < data.length; i++) {
    if (isNaN(emaFast[i]) || isNaN(emaSlow[i])) {
      macd.push(NaN);
    } else {
      macd.push(emaFast[i] - emaSlow[i]);
    }
  }
  
  // シグナル線計算（MACDのEMA）
  const signal = calculateEMA(macd.filter(x => !isNaN(x)), signalPeriod);
  
  // ヒストグラム計算
  const histogram: number[] = [];
  let signalIndex = 0;
  
  for (let i = 0; i < macd.length; i++) {
    if (isNaN(macd[i])) {
      histogram.push(NaN);
    } else {
      if (signalIndex < signal.length) {
        histogram.push(macd[i] - signal[signalIndex]);
        signalIndex++;
      } else {
        histogram.push(NaN);
      }
    }
  }
  
  // シグナル配列を元の長さに調整
  const adjustedSignal: number[] = [];
  let adjustedIndex = 0;
  
  for (let i = 0; i < macd.length; i++) {
    if (isNaN(macd[i])) {
      adjustedSignal.push(NaN);
    } else {
      if (adjustedIndex < signal.length) {
        adjustedSignal.push(signal[adjustedIndex]);
        adjustedIndex++;
      } else {
        adjustedSignal.push(NaN);
      }
    }
  }
  
  return {
    macd,
    signal: adjustedSignal,
    histogram
  };
}

// ボリンジャーバンド計算
export function calculateBollingerBands(data: number[], period: number = 20, stdDev: number = 2) {
  const sma = calculateSMA(data, period);
  const upper: number[] = [];
  const middle: number[] = [];
  const lower: number[] = [];
  
  for (let i = 0; i < data.length; i++) {
    if (i < period - 1) {
      upper.push(NaN);
      middle.push(NaN);
      lower.push(NaN);
    } else {
      const slice = data.slice(i - period + 1, i + 1);
      const mean = sma[i];
      const variance = slice.reduce((sum, value) => sum + Math.pow(value - mean, 2), 0) / period;
      const standardDeviation = Math.sqrt(variance);
      
      middle.push(mean);
      upper.push(mean + (standardDeviation * stdDev));
      lower.push(mean - (standardDeviation * stdDev));
    }
  }
  
  return { upper, middle, lower };
}

// 全てのテクニカル指標を計算
export function calculateAllIndicators(priceData: PriceData[]): TechnicalIndicators {
  const closePrices = priceData.map(d => d.close);
  
  const rsi = calculateRSI(closePrices);
  const macd = calculateMACD(closePrices);
  const bollingerBands = calculateBollingerBands(closePrices);
  
  const sma = {
    sma5: calculateSMA(closePrices, 5),
    sma20: calculateSMA(closePrices, 20),
    sma50: calculateSMA(closePrices, 50)
  };
  
  const ema = {
    ema12: calculateEMA(closePrices, 12),
    ema26: calculateEMA(closePrices, 26)
  };
  
  return {
    rsi,
    macd,
    sma,
    ema,
    bollingerBands
  };
}

// 最新の指標値を取得
export function getLatestIndicators(indicators: TechnicalIndicators) {
  const getLastValid = (arr: number[]) => {
    for (let i = arr.length - 1; i >= 0; i--) {
      if (!isNaN(arr[i])) return arr[i];
    }
    return null;
  };
  
  return {
    rsi: getLastValid(indicators.rsi),
    macd: {
      macd: getLastValid(indicators.macd.macd),
      signal: getLastValid(indicators.macd.signal),
      histogram: getLastValid(indicators.macd.histogram)
    },
    sma: {
      sma5: getLastValid(indicators.sma.sma5),
      sma20: getLastValid(indicators.sma.sma20),
      sma50: getLastValid(indicators.sma.sma50)
    },
    ema: {
      ema12: getLastValid(indicators.ema.ema12),
      ema26: getLastValid(indicators.ema.ema26)
    },
    bollingerBands: {
      upper: getLastValid(indicators.bollingerBands.upper),
      middle: getLastValid(indicators.bollingerBands.middle),
      lower: getLastValid(indicators.bollingerBands.lower)
    }
  };
}