// Market Data Integration - Fetch market data and valuation metrics

import yahooFinance from "yahoo-finance2";

// Yahoo Finance Quote の型定義
interface YahooQuote {
  regularMarketPrice?: number;
  regularMarketVolume?: number;
  marketCap?: number;
  sharesOutstanding?: number;
}

// S&P 500の過去10年平均EPS（概算値、定期更新推奨）
const SP500_10Y_AVG_EPS = 180;
// S&P 500の売上高（兆ドル、概算）
const SP500_SALES_TRILLION = 1.8;
// 米国GDP（兆ドル、概算）
const US_GDP_TRILLION = 27.5;

export async function getMarketValuationMetrics() {
  try {
    // Fetch S&P 500 data
    console.log("[Market Data] Fetching S&P 500 quote...");
    const sp500Data = await yahooFinance.quote("^GSPC") as YahooQuote;
    const sp500Current = sp500Data?.regularMarketPrice || 5000;
    console.log(`[Market Data] S&P 500 price: ${sp500Current}`);

    // Shiller P/E ratio (CAPE) - S&P価格 / 10年平均EPS
    const shillerPE = sp500Current / SP500_10Y_AVG_EPS;
    console.log(`[Market Data] Shiller P/E: ${shillerPE.toFixed(2)}`);

    // Price-to-Sales ratio - S&P時価総額 / 売上高
    // S&P 500の時価総額は約45兆ドル
    const sp500MarketCap = await getApproxSP500MarketCap();
    const priceToSales = sp500MarketCap / SP500_SALES_TRILLION;
    console.log(`[Market Data] Price-to-Sales: ${priceToSales.toFixed(2)}`);

    // Buffett Indicator - 全市場時価総額 / GDP (%)
    // Wilshire 5000をプロキシとして使用
    const buffettIndicator = await getBuffettIndicator();
    console.log(`[Market Data] Buffett Indicator: ${buffettIndicator.toFixed(1)}%`);

    // Earnings Yield Spread - 株式益利回り vs 10年国債利回り
    const earningsYieldSpread = await getEarningsYieldSpread(sp500Current);
    console.log(`[Market Data] Earnings Yield Spread: ${earningsYieldSpread.toFixed(2)}%`);

    // S&P 500 Concentration metrics
    const concentration = await getIndexConcentration();

    // Leveraged ETF balances
    const leveragedETFBalance = await getLeveragedETFBalance();

    return {
      shillerPE,
      priceToSales,
      buffettIndicator,
      earningsYieldSpread,
      concentration,
      leveragedETFBalance,
    };
  } catch (error) {
    console.error("[Market Data] Error fetching market valuation metrics:", error);
    return {
      shillerPE: 25,
      priceToSales: 2.5,
      buffettIndicator: 180,
      earningsYieldSpread: 2.0,
      concentration: 30,
      leveragedETFBalance: 150000,
    };
  }
}

// S&P 500の概算時価総額を取得（兆ドル）
async function getApproxSP500MarketCap(): Promise<number> {
  try {
    // SPY ETFのAUMからS&P 500時価総額を推定
    const spyData = await yahooFinance.quote("SPY") as YahooQuote;
    const spyPrice = spyData?.regularMarketPrice || 500;
    // SPY 1株 ≒ S&P 500指数 / 10、SPYの総資産は約5000億ドル
    // S&P 500時価総額は約45兆ドル
    return spyPrice * 0.09; // 概算変換係数
  } catch {
    return 45; // デフォルト45兆ドル
  }
}

// バフェット指標を取得
async function getBuffettIndicator(): Promise<number> {
  try {
    // Wilshire 5000 Total Market Index (^W5000) を取得
    const wilshireData = await yahooFinance.quote("^W5000") as YahooQuote;
    if (wilshireData?.regularMarketPrice) {
      // Wilshire 5000の値（ポイント）≒ 市場時価総額（10億ドル単位）
      const totalMarketCapBillion = wilshireData.regularMarketPrice;
      const gdpBillion = US_GDP_TRILLION * 1000;
      return (totalMarketCapBillion / gdpBillion) * 100;
    }
    // フォールバック: VTI（全米株式ETF）から推定
    const vtiData = await yahooFinance.quote("VTI") as YahooQuote;
    if (vtiData?.regularMarketPrice) {
      // VTI価格から概算（VTI $280 ≒ 180%程度）
      return (vtiData.regularMarketPrice / 280) * 180;
    }
    return 180;
  } catch {
    return 180;
  }
}

// 益利回りスプレッドを計算
async function getEarningsYieldSpread(sp500Price: number): Promise<number> {
  try {
    // S&P 500 Forward EPS（予想EPS）
    const forwardEPS = 250; // 2024-2025年の概算
    const earningsYield = (forwardEPS / sp500Price) * 100;

    // 10年国債利回りを取得（^TNX）
    const tnxData = await yahooFinance.quote("^TNX") as YahooQuote;
    const treasuryYield = tnxData?.regularMarketPrice || 4.0;

    return earningsYield - treasuryYield;
  } catch {
    return 2.0;
  }
}

async function getIndexConcentration(): Promise<number> {
  try {
    // Fetch top 7 stocks in S&P 500 by market cap
    const megacapStocks = ["NVDA", "MSFT", "AAPL", "GOOGL", "AMZN", "TSLA", "META"];
    console.log("[Market Data] Fetching megacap stocks for concentration...");

    const quotes = await Promise.allSettled(
      megacapStocks.map(async (symbol) => {
        try {
          const data = await yahooFinance.quote(symbol) as YahooQuote;
          return {
            symbol,
            marketCap: data?.marketCap || 0,
          };
        } catch {
          return { symbol, marketCap: 0 };
        }
      })
    );

    // 上位7社の時価総額合計
    const megacapTotalMarketCap = quotes.reduce((sum, result) => {
      if (result.status === "fulfilled") {
        return sum + (result.value.marketCap || 0);
      }
      return sum;
    }, 0);

    // S&P 500全体の時価総額（約45兆ドル = 45,000,000,000,000）
    const sp500TotalMarketCap = 45_000_000_000_000;

    // 集中度 = 上位7社の時価総額 / S&P 500全体の時価総額 × 100
    const concentration = (megacapTotalMarketCap / sp500TotalMarketCap) * 100;
    console.log(`[Market Data] Megacap total: $${(megacapTotalMarketCap / 1e12).toFixed(2)}T, Concentration: ${concentration.toFixed(1)}%`);

    return Math.min(100, Math.max(0, concentration));
  } catch (error) {
    console.error("[Market Data] Error calculating concentration:", error);
    return 30;
  }
}

async function getLeveragedETFBalance(): Promise<number> {
  try {
    // レバレッジETFの取引量と価格からノーショナル額を推定
    const leveragedETFs = ["UPRO", "SSO", "SPXL", "TQQQ", "SQQQ", "SPXS"];
    console.log("[Market Data] Fetching leveraged ETF data...");

    const etfData = await Promise.allSettled(
      leveragedETFs.map(async (symbol) => {
        try {
          const data = await yahooFinance.quote(symbol) as YahooQuote;
          return {
            symbol,
            price: data?.regularMarketPrice || 0,
            volume: data?.regularMarketVolume || 0,
            // sharesOutstandingからAUMを推定
            sharesOutstanding: data?.sharesOutstanding || 0,
          };
        } catch {
          return { symbol, price: 0, volume: 0, sharesOutstanding: 0 };
        }
      })
    );

    // 各ETFのAUM（価格 × 発行済株数）を合計
    let totalAUM = 0;
    etfData.forEach((result) => {
      if (result.status === "fulfilled") {
        const { price, sharesOutstanding } = result.value;
        if (price > 0 && sharesOutstanding > 0) {
          totalAUM += price * sharesOutstanding;
        } else if (price > 0) {
          // sharesOutstandingが取得できない場合は出来高から推定
          totalAUM += price * result.value.volume * 0.1; // 概算係数
        }
      }
    });

    // 百万ドル単位に変換
    const totalAUMMillions = totalAUM / 1_000_000;
    console.log(`[Market Data] Leveraged ETF total AUM: $${totalAUMMillions.toFixed(0)}M`);

    return totalAUMMillions;
  } catch (error) {
    console.error("[Market Data] Error fetching leveraged ETF balance:", error);
    return 150000; // デフォルト1500億ドル
  }
}

export async function getSP500Price(): Promise<number> {
  try {
    const data = await yahooFinance.quote("^GSPC") as YahooQuote;
    return data?.regularMarketPrice || 5000;
  } catch (error) {
    console.error("[Market Data] Error fetching S&P 500 price:", error);
    return 5000;
  }
}
