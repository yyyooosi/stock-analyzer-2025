import { calculateAllIndicators, getLatestIndicators } from './technicalIndicators';
import { analyzeSignals, SignalAnalysis } from './signalAnalysis';

interface PriceData {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

interface Trade {
  date: string;
  type: 'BUY' | 'SELL';
  price: number;
  signal: SignalAnalysis['signal'];
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

interface BacktestConfig {
  initialCapital: number;
  commissionRate: number; // 手数料率 (例: 0.001 = 0.1%)
  riskPerTrade: number; // 1回の取引のリスク割合 (例: 0.02 = 2%)
  stopLossPercent: number; // ストップロス (例: 0.05 = 5%)
  takeProfitPercent: number; // 利益確定 (例: 0.1 = 10%)
}

const defaultConfig: BacktestConfig = {
  initialCapital: 10000,
  commissionRate: 0.001,
  riskPerTrade: 0.1, // 10%に増加
  stopLossPercent: 0.08, // 8%に調整
  takeProfitPercent: 0.12 // 12%に調整
};

export function runBacktest(
  priceData: PriceData[],
  config: BacktestConfig = defaultConfig
): BacktestResult {
  const trades: Trade[] = [];
  const portfolioValue: Array<{ date: string; value: number; buyAndHoldValue: number }> = [];
  
  let currentCapital = config.initialCapital;
  let currentShares = 0;
  let currentPosition: 'NONE' | 'LONG' = 'NONE';
  let entryPrice = 0;
  let totalCommissions = 0;
  
  // Buy and Hold 基準値
  const initialPrice = priceData[0].close;
  const buyAndHoldShares = config.initialCapital / initialPrice;
  
  // 各日付でシグナルを計算
  for (let i = 15; i < priceData.length; i++) { // 最初の15日は指標計算のためスキップ
    const historicalData = priceData.slice(0, i + 1);
    const indicators = calculateAllIndicators(historicalData);
    const latestIndicators = getLatestIndicators(indicators);
    const currentPrice = priceData[i].close;
    const signalAnalysis = analyzeSignals(latestIndicators, currentPrice);
    
    // ポートフォリオ価値の記録
    const currentValue = currentPosition === 'LONG' 
      ? currentCapital + (currentShares * currentPrice)
      : currentCapital;
    
    const buyAndHoldValue = buyAndHoldShares * currentPrice;
    
    portfolioValue.push({
      date: priceData[i].date,
      value: currentValue,
      buyAndHoldValue: buyAndHoldValue
    });
    
    // 既存ポジションのストップロス/利益確定チェック
    if (currentPosition === 'LONG') {
      const priceChange = (currentPrice - entryPrice) / entryPrice;
      
      // ストップロス
      if (priceChange <= -config.stopLossPercent) {
        const commission = currentShares * currentPrice * config.commissionRate;
        currentCapital = currentShares * currentPrice - commission;
        totalCommissions += commission;
        
        trades.push({
          date: priceData[i].date,
          type: 'SELL',
          price: currentPrice,
          signal: 'SELL',
          confidence: 90,
          shares: currentShares,
          value: currentShares * currentPrice
        });
        
        currentShares = 0;
        currentPosition = 'NONE';
        entryPrice = 0;
        continue;
      }
      
      // 利益確定
      if (priceChange >= config.takeProfitPercent) {
        const commission = currentShares * currentPrice * config.commissionRate;
        currentCapital = currentShares * currentPrice - commission;
        totalCommissions += commission;
        
        trades.push({
          date: priceData[i].date,
          type: 'SELL',
          price: currentPrice,
          signal: 'SELL',
          confidence: signalAnalysis.confidence,
          shares: currentShares,
          value: currentShares * currentPrice
        });
        
        currentShares = 0;
        currentPosition = 'NONE';
        entryPrice = 0;
        continue;
      }
    }
    
    // 新しいシグナルに基づく取引判定
    if (signalAnalysis.confidence >= 60) { // 信頼度60%以上でのみ取引（調整）
      if ((signalAnalysis.signal === 'STRONG_BUY' || signalAnalysis.signal === 'BUY') && 
          currentPosition === 'NONE') {
        // 買いシグナル
        const investmentAmount = currentCapital * config.riskPerTrade;
        const commission = investmentAmount * config.commissionRate;
        const sharesToBuy = Math.floor((investmentAmount - commission) / currentPrice);
        
        if (sharesToBuy > 0 && currentCapital >= investmentAmount) {
          const totalCost = sharesToBuy * currentPrice + commission;
          currentCapital -= totalCost;
          currentShares = sharesToBuy;
          currentPosition = 'LONG';
          entryPrice = currentPrice;
          totalCommissions += commission;
          
          trades.push({
            date: priceData[i].date,
            type: 'BUY',
            price: currentPrice,
            signal: signalAnalysis.signal,
            confidence: signalAnalysis.confidence,
            shares: sharesToBuy,
            value: totalCost
          });
        }
      } else if ((signalAnalysis.signal === 'STRONG_SELL' || signalAnalysis.signal === 'SELL') && 
                 currentPosition === 'LONG') {
        // 売りシグナル
        const commission = currentShares * currentPrice * config.commissionRate;
        currentCapital = currentShares * currentPrice - commission;
        totalCommissions += commission;
        
        trades.push({
          date: priceData[i].date,
          type: 'SELL',
          price: currentPrice,
          signal: signalAnalysis.signal,
          confidence: signalAnalysis.confidence,
          shares: currentShares,
          value: currentShares * currentPrice
        });
        
        currentShares = 0;
        currentPosition = 'NONE';
        entryPrice = 0;
      }
    }
  }
  
  // 最終日に残っているポジションを決済
  if (currentPosition === 'LONG' && priceData.length > 0) {
    const finalPrice = priceData[priceData.length - 1].close;
    const commission = currentShares * finalPrice * config.commissionRate;
    currentCapital = currentShares * finalPrice - commission;
    totalCommissions += commission;
    
    trades.push({
      date: priceData[priceData.length - 1].date,
      type: 'SELL',
      price: finalPrice,
      signal: 'HOLD',
      confidence: 50,
      shares: currentShares,
      value: currentShares * finalPrice
    });
  }
  
  // パフォーマンス指標の計算
  const finalValue = currentCapital;
  const totalReturn = (finalValue - config.initialCapital) / config.initialCapital;
  const tradingDays = priceData.length;
  const annualizedReturn = Math.pow(1 + totalReturn, 252 / tradingDays) - 1;
  
  // 取引ペアの分析
  const tradePairs: Array<{ buy: Trade; sell: Trade; profit: number }> = [];
  for (let i = 0; i < trades.length - 1; i += 2) {
    if (trades[i].type === 'BUY' && trades[i + 1].type === 'SELL') {
      const profit = trades[i + 1].value - trades[i].value;
      tradePairs.push({
        buy: trades[i],
        sell: trades[i + 1],
        profit: profit
      });
    }
  }
  
  const winningTrades = tradePairs.filter(pair => pair.profit > 0);
  const losingTrades = tradePairs.filter(pair => pair.profit <= 0);
  const winRate = tradePairs.length > 0 ? winningTrades.length / tradePairs.length : 0;
  const averageWin = winningTrades.length > 0 
    ? winningTrades.reduce((sum, trade) => sum + trade.profit, 0) / winningTrades.length 
    : 0;
  const averageLoss = losingTrades.length > 0 
    ? Math.abs(losingTrades.reduce((sum, trade) => sum + trade.profit, 0) / losingTrades.length)
    : 0;
  
  // 最大ドローダウンの計算
  let maxDrawdown = 0;
  let peak = config.initialCapital;
  
  for (const pv of portfolioValue) {
    if (pv.value > peak) {
      peak = pv.value;
    }
    const drawdown = (peak - pv.value) / peak;
    if (drawdown > maxDrawdown) {
      maxDrawdown = drawdown;
    }
  }
  
  // シャープレシオの計算（簡易版）
  const returns = portfolioValue.map((pv, index) => {
    if (index === 0) return 0;
    return (pv.value - portfolioValue[index - 1].value) / portfolioValue[index - 1].value;
  }).slice(1);
  
  const averageReturn = returns.reduce((sum, ret) => sum + ret, 0) / returns.length;
  const returnStdDev = Math.sqrt(
    returns.reduce((sum, ret) => sum + Math.pow(ret - averageReturn, 2), 0) / returns.length
  );
  const sharpeRatio = returnStdDev > 0 ? (averageReturn * Math.sqrt(252)) / (returnStdDev * Math.sqrt(252)) : 0;
  
  // Buy and Hold リターンの計算
  const finalPrice = priceData[priceData.length - 1].close;
  const buyAndHoldReturn = (finalPrice - initialPrice) / initialPrice;
  
  return {
    trades,
    performance: {
      totalReturn,
      annualizedReturn,
      winRate,
      totalTrades: tradePairs.length,
      winningTrades: winningTrades.length,
      losingTrades: losingTrades.length,
      averageWin,
      averageLoss,
      maxDrawdown,
      sharpeRatio,
      finalValue,
      buyAndHoldReturn
    },
    portfolioValue
  };
}

// 複数パラメータでのバックテスト
export function runParameterOptimization(
  priceData: PriceData[]
): Array<{ config: BacktestConfig; result: BacktestResult }> {
  const results: Array<{ config: BacktestConfig; result: BacktestResult }> = [];
  
  // 異なるパラメータの組み合わせをテスト
  const stopLossOptions = [0.03, 0.05, 0.07];
  const takeProfitOptions = [0.10, 0.15, 0.20];
  const riskOptions = [0.01, 0.02, 0.03];
  
  for (const stopLoss of stopLossOptions) {
    for (const takeProfit of takeProfitOptions) {
      for (const risk of riskOptions) {
        const config: BacktestConfig = {
          ...defaultConfig,
          stopLossPercent: stopLoss,
          takeProfitPercent: takeProfit,
          riskPerTrade: risk
        };
        
        const result = runBacktest(priceData, config);
        results.push({ config, result });
      }
    }
  }
  
  // 総リターンで並び替え
  return results.sort((a, b) => b.result.performance.totalReturn - a.result.performance.totalReturn);
}