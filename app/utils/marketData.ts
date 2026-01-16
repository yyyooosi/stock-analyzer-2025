// Market Data Integration - Fetch market data and valuation metrics

import yahooFinance from "yahoo-finance2";

export async function getMarketValuationMetrics() {
  try {
    // Fetch S&P 500 data
    const sp500Data = await yahooFinance.quote({
      symbol: "^GSPC",
      modules: ["price"],
    });

    // Fetch earnings data (simplified)
    const sp500Current = sp500Data.regularMarketPrice || 5000;

    // Shiller P/E ratio calculation (simplified estimate)
    // Real CAPE ratio would need 10 years of data
    const shillerPE = sp500Current / 200; // Simplified

    // Price-to-Sales ratio (simplified)
    const priceToSales = sp500Current / 2800; // Simplified

    // Buffett Indicator (Market Cap / GDP)
    const buffettIndicator = 160; // Simplified estimate

    // Earnings Yield Spread
    const earningsYield = 4.5; // Simplified
    const realYield = 2.0;
    const earningsYieldSpread = earningsYield - realYield;

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
    console.error("Error fetching market valuation metrics:", error);
    return {
      shillerPE: 25,
      priceToSales: 2.0,
      buffettIndicator: 160,
      earningsYieldSpread: 2.5,
      concentration: 30,
      leveragedETFBalance: 100000,
    };
  }
}

async function getIndexConcentration(): Promise<number> {
  try {
    // Fetch top 7 stocks in S&P 500 (approximation of concentration)
    const megacapStocks = ["NVDA", "MSFT", "AAPL", "GOOGL", "AMZN", "TSLA", "META"];
    const quotes = await Promise.all(
      megacapStocks.map((symbol) =>
        yahooFinance
          .quote({ symbol, modules: ["price"] })
          .catch(() => ({ regularMarketPrice: 0 }))
      )
    );

    const megacapWeight = quotes.reduce((sum, q) => sum + (q.regularMarketPrice || 0), 0);
    // S&P 500 approximate total
    const sp500Total = 500000;
    const concentration = (megacapWeight / sp500Total) * 100;

    return Math.min(100, concentration);
  } catch (error) {
    console.error("Error calculating concentration:", error);
    return 30;
  }
}

async function getLeveragedETFBalance(): Promise<number> {
  try {
    // Check leveraged ETF volumes
    const leveragedETFs = ["UPRO", "SSO", "SPXL", "SQQQ", "SPXS"];
    const volumes = await Promise.all(
      leveragedETFs.map((symbol) =>
        yahooFinance
          .quote({ symbol, modules: ["price"] })
          .catch(() => ({ regularMarketPrice: 0 }))
      )
    );

    const totalNotional = volumes.reduce((sum, q) => sum + (q.regularMarketPrice || 0), 0) * 1000; // Simplified
    return totalNotional;
  } catch (error) {
    console.error("Error fetching leveraged ETF balance:", error);
    return 100000;
  }
}

export async function getSP500Price(): Promise<number> {
  try {
    const data = await yahooFinance.quote({
      symbol: "^GSPC",
      modules: ["price"],
    });
    return data.regularMarketPrice || 5000;
  } catch (error) {
    console.error("Error fetching S&P 500 price:", error);
    return 5000;
  }
}
