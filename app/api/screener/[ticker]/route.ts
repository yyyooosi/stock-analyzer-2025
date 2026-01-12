import { NextRequest, NextResponse } from 'next/server';
import {
  StockFundamentals,
  ScreenerResult,
  calculateScore,
} from '@/app/utils/screener';
import { fetchStockQuote } from '@/app/utils/stockQuote';

// Helper function to enrich stock data with new fields
function enrichStockData(stock: Partial<StockFundamentals>): StockFundamentals {
  const price = stock.price || 100;
  const marketCap = stock.marketCap || 1000000000;

  return {
    ...stock,
    // Ensure all new required fields are present
    marketCapUSD: stock.marketCapUSD || marketCap,
    forwardPER: stock.forwardPER || (stock.per ? stock.per * 0.95 : null),
    evEbitda: stock.evEbitda || (stock.per ? stock.per * 0.8 : null),
    grossMargin: stock.grossMargin || (stock.operatingMargin ? stock.operatingMargin! + 10 : null),
    rdExpenseRatio:
      stock.rdExpenseRatio ||
      (stock.sector === 'Technology' ? Math.random() * 15 + 5 : Math.random() * 5),
    debtToEquity:
      stock.debtToEquity ||
      (stock.debtRatio && stock.equityRatio
        ? stock.debtRatio / stock.equityRatio
        : stock.debtRatio
          ? stock.debtRatio / 50
          : null),
    freeCashFlow: stock.freeCashFlow || (stock.operatingCF ? stock.operatingCF * 0.8 : null),
    freeCashFlow3YTrend:
      stock.freeCashFlow3YTrend || (stock.operatingCF && stock.operatingCF > 0 ? 'positive' : 'neutral'),
    week52High: stock.week52High || price * 1.15,
    week52HighDistance: stock.week52HighDistance || -((price * 1.15 - price) / (price * 1.15)) * 100,
    twitterMentionCount30d:
      stock.twitterMentionCount30d || Math.floor(Math.random() * 1000) + 100,
    twitterMentionTrend:
      stock.twitterMentionTrend ||
      (['increasing', 'decreasing', 'stable'][
        Math.floor(Math.random() * 3)
      ] as 'increasing' | 'decreasing' | 'stable'),
    twitterSentiment:
      stock.twitterSentiment ||
      (['positive', 'neutral', 'negative'][
        Math.floor(Math.random() * 3)
      ] as 'positive' | 'neutral' | 'negative'),
    hasNegativeKeywords: stock.hasNegativeKeywords || Math.random() > 0.8,
  } as StockFundamentals;
}

// Sample stock data (same as in main screener route)
const SAMPLE_STOCKS_RAW: Partial<StockFundamentals>[] = [
  {
    symbol: 'AAPL',
    name: 'Apple Inc.',
    sector: 'Technology',
    industry: 'Consumer Electronics',
    marketCap: 3000000000000,
    price: 185.5,
    change: 2.35,
    changePercent: 1.28,
    per: 28.5,
    pbr: 45.2,
    peg: 2.1,
    psRatio: 7.5,
    roe: 147.5,
    epsGrowth3Y: 15.2,
    epsGrowth5Y: 18.5,
    revenueGrowth: 8.5,
    operatingMargin: 29.8,
    equityRatio: 17.5,
    currentRatio: 1.0,
    debtRatio: 82.5,
    operatingCF: 110000000000,
    dividendYield: 0.5,
    consecutiveDividendYears: 12,
    payoutRatio: 15.0,
    sma50: 178.5,
    sma200: 172.3,
    rsi: 55.2,
    macdSignal: 'bullish',
    volumeChange: 12.5,
  },
  {
    symbol: 'MSFT',
    name: 'Microsoft Corporation',
    sector: 'Technology',
    industry: 'Software',
    marketCap: 2800000000000,
    price: 378.5,
    change: 4.25,
    changePercent: 1.14,
    per: 34.2,
    pbr: 12.8,
    peg: 2.3,
    psRatio: 12.5,
    roe: 38.5,
    epsGrowth3Y: 18.5,
    epsGrowth5Y: 22.3,
    revenueGrowth: 15.2,
    operatingMargin: 42.1,
    equityRatio: 42.5,
    currentRatio: 1.8,
    debtRatio: 35.2,
    operatingCF: 87000000000,
    dividendYield: 0.8,
    consecutiveDividendYears: 21,
    payoutRatio: 25.0,
    sma50: 365.2,
    sma200: 340.5,
    rsi: 58.5,
    macdSignal: 'bullish',
    volumeChange: 8.2,
  },
  {
    symbol: 'GOOGL',
    name: 'Alphabet Inc.',
    sector: 'Technology',
    industry: 'Internet Content & Information',
    marketCap: 1900000000000,
    price: 152.3,
    change: 1.85,
    changePercent: 1.23,
    per: 24.5,
    pbr: 6.2,
    peg: 1.2,
    psRatio: 6.0,
    roe: 25.8,
    epsGrowth3Y: 22.5,
    epsGrowth5Y: 20.1,
    revenueGrowth: 12.5,
    operatingMargin: 27.5,
    equityRatio: 68.5,
    currentRatio: 2.1,
    debtRatio: 10.5,
    operatingCF: 91000000000,
    dividendYield: 0.0,
    consecutiveDividendYears: 0,
    payoutRatio: 0,
    sma50: 145.2,
    sma200: 138.5,
    rsi: 52.3,
    macdSignal: 'bullish',
    volumeChange: 15.8,
  },
  {
    symbol: 'NVDA',
    name: 'NVIDIA Corporation',
    sector: 'Technology',
    industry: 'Semiconductors',
    marketCap: 1200000000000,
    price: 184.86,
    change: -0.18,
    changePercent: -0.10,
    per: 62.5,
    pbr: 38.5,
    peg: 0.9,
    psRatio: 22.5,
    roe: 85.2,
    epsGrowth3Y: 85.5,
    epsGrowth5Y: 62.3,
    revenueGrowth: 122.5,
    operatingMargin: 54.2,
    equityRatio: 55.2,
    currentRatio: 4.2,
    debtRatio: 18.5,
    operatingCF: 28000000000,
    dividendYield: 0.04,
    consecutiveDividendYears: 8,
    payoutRatio: 3.5,
    sma50: 450.2,
    sma200: 380.5,
    rsi: 68.5,
    macdSignal: 'bullish',
    volumeChange: 45.2,
  },
  {
    symbol: 'JNJ',
    name: 'Johnson & Johnson',
    sector: 'Healthcare',
    industry: 'Drug Manufacturers',
    marketCap: 380000000000,
    price: 158.2,
    change: -0.85,
    changePercent: -0.53,
    per: 15.2,
    pbr: 5.8,
    peg: 2.5,
    psRatio: 4.2,
    roe: 22.5,
    epsGrowth3Y: 5.2,
    epsGrowth5Y: 6.8,
    revenueGrowth: 3.5,
    operatingMargin: 24.5,
    equityRatio: 48.5,
    currentRatio: 1.2,
    debtRatio: 42.5,
    operatingCF: 22000000000,
    dividendYield: 3.0,
    consecutiveDividendYears: 61,
    payoutRatio: 45.0,
    sma50: 160.5,
    sma200: 155.2,
    rsi: 42.5,
    macdSignal: 'bearish',
    volumeChange: -5.2,
  },
  {
    symbol: 'JPM',
    name: 'JPMorgan Chase & Co.',
    sector: 'Financial Services',
    industry: 'Banks',
    marketCap: 520000000000,
    price: 178.5,
    change: 1.25,
    changePercent: 0.71,
    per: 10.5,
    pbr: 1.8,
    peg: 1.5,
    psRatio: 3.2,
    roe: 15.2,
    epsGrowth3Y: 8.5,
    epsGrowth5Y: 12.5,
    revenueGrowth: 8.2,
    operatingMargin: 38.5,
    equityRatio: 12.5,
    currentRatio: null,
    debtRatio: 85.5,
    operatingCF: 45000000000,
    dividendYield: 2.5,
    consecutiveDividendYears: 14,
    payoutRatio: 25.0,
    sma50: 172.5,
    sma200: 165.2,
    rsi: 55.8,
    macdSignal: 'bullish',
    volumeChange: 8.5,
  },
  {
    symbol: 'PG',
    name: 'Procter & Gamble Co.',
    sector: 'Consumer Defensive',
    industry: 'Household Products',
    marketCap: 350000000000,
    price: 148.5,
    change: 0.45,
    changePercent: 0.3,
    per: 24.5,
    pbr: 7.5,
    peg: 3.2,
    psRatio: 4.5,
    roe: 32.5,
    epsGrowth3Y: 6.5,
    epsGrowth5Y: 7.8,
    revenueGrowth: 4.2,
    operatingMargin: 22.5,
    equityRatio: 38.5,
    currentRatio: 0.8,
    debtRatio: 55.2,
    operatingCF: 18000000000,
    dividendYield: 2.5,
    consecutiveDividendYears: 67,
    payoutRatio: 62.0,
    sma50: 145.2,
    sma200: 142.5,
    rsi: 48.5,
    macdSignal: 'neutral',
    volumeChange: 2.5,
  },
  {
    symbol: 'XOM',
    name: 'Exxon Mobil Corporation',
    sector: 'Energy',
    industry: 'Oil & Gas',
    marketCap: 450000000000,
    price: 108.5,
    change: -1.25,
    changePercent: -1.14,
    per: 12.5,
    pbr: 2.2,
    peg: 1.8,
    psRatio: 1.2,
    roe: 18.5,
    epsGrowth3Y: 35.5,
    epsGrowth5Y: 15.2,
    revenueGrowth: 12.5,
    operatingMargin: 15.2,
    equityRatio: 52.5,
    currentRatio: 1.5,
    debtRatio: 22.5,
    operatingCF: 55000000000,
    dividendYield: 3.5,
    consecutiveDividendYears: 41,
    payoutRatio: 42.0,
    sma50: 112.5,
    sma200: 105.2,
    rsi: 38.5,
    macdSignal: 'bearish',
    volumeChange: -12.5,
  },
  {
    symbol: 'V',
    name: 'Visa Inc.',
    sector: 'Financial Services',
    industry: 'Credit Services',
    marketCap: 520000000000,
    price: 258.5,
    change: 2.85,
    changePercent: 1.11,
    per: 28.5,
    pbr: 12.5,
    peg: 1.8,
    psRatio: 15.5,
    roe: 45.2,
    epsGrowth3Y: 15.5,
    epsGrowth5Y: 18.2,
    revenueGrowth: 11.5,
    operatingMargin: 67.5,
    equityRatio: 42.5,
    currentRatio: 1.5,
    debtRatio: 48.5,
    operatingCF: 19000000000,
    dividendYield: 0.8,
    consecutiveDividendYears: 15,
    payoutRatio: 22.0,
    sma50: 252.5,
    sma200: 245.2,
    rsi: 62.5,
    macdSignal: 'bullish',
    volumeChange: 5.2,
  },
  {
    symbol: 'UNH',
    name: 'UnitedHealth Group Inc.',
    sector: 'Healthcare',
    industry: 'Healthcare Plans',
    marketCap: 480000000000,
    price: 525.5,
    change: 3.25,
    changePercent: 0.62,
    per: 22.5,
    pbr: 5.8,
    peg: 1.5,
    psRatio: 1.5,
    roe: 25.5,
    epsGrowth3Y: 14.5,
    epsGrowth5Y: 15.8,
    revenueGrowth: 12.5,
    operatingMargin: 8.5,
    equityRatio: 35.5,
    currentRatio: 0.8,
    debtRatio: 52.5,
    operatingCF: 28000000000,
    dividendYield: 1.5,
    consecutiveDividendYears: 14,
    payoutRatio: 32.0,
    sma50: 515.2,
    sma200: 495.5,
    rsi: 52.5,
    macdSignal: 'bullish',
    volumeChange: 8.5,
  },
  {
    symbol: 'KO',
    name: 'Coca-Cola Company',
    sector: 'Consumer Defensive',
    industry: 'Beverages',
    marketCap: 260000000000,
    price: 60.5,
    change: 0.25,
    changePercent: 0.41,
    per: 22.5,
    pbr: 10.5,
    peg: 3.5,
    psRatio: 5.8,
    roe: 42.5,
    epsGrowth3Y: 5.5,
    epsGrowth5Y: 6.2,
    revenueGrowth: 5.5,
    operatingMargin: 28.5,
    equityRatio: 25.5,
    currentRatio: 1.1,
    debtRatio: 68.5,
    operatingCF: 11000000000,
    dividendYield: 3.1,
    consecutiveDividendYears: 61,
    payoutRatio: 72.0,
    sma50: 58.5,
    sma200: 57.2,
    rsi: 55.5,
    macdSignal: 'neutral',
    volumeChange: 2.2,
  },
  {
    symbol: 'AMZN',
    name: 'Amazon.com Inc.',
    sector: 'Consumer Cyclical',
    industry: 'Internet Retail',
    marketCap: 1550000000000,
    price: 150.5,
    change: 2.15,
    changePercent: 1.45,
    per: 58.5,
    pbr: 8.5,
    peg: 1.5,
    psRatio: 2.8,
    roe: 15.5,
    epsGrowth3Y: 45.5,
    epsGrowth5Y: 32.5,
    revenueGrowth: 12.5,
    operatingMargin: 6.5,
    equityRatio: 42.5,
    currentRatio: 1.1,
    debtRatio: 42.5,
    operatingCF: 65000000000,
    dividendYield: 0,
    consecutiveDividendYears: 0,
    payoutRatio: 0,
    sma50: 145.2,
    sma200: 135.5,
    rsi: 58.5,
    macdSignal: 'bullish',
    volumeChange: 18.5,
  },
  {
    symbol: 'META',
    name: 'Meta Platforms Inc.',
    sector: 'Technology',
    industry: 'Internet Content & Information',
    marketCap: 850000000000,
    price: 335.5,
    change: 5.25,
    changePercent: 1.59,
    per: 22.5,
    pbr: 6.5,
    peg: 0.8,
    psRatio: 6.2,
    roe: 28.5,
    epsGrowth3Y: 32.5,
    epsGrowth5Y: 25.5,
    revenueGrowth: 22.5,
    operatingMargin: 35.5,
    equityRatio: 58.5,
    currentRatio: 2.8,
    debtRatio: 18.5,
    operatingCF: 52000000000,
    dividendYield: 0.5,
    consecutiveDividendYears: 1,
    payoutRatio: 8.0,
    sma50: 320.5,
    sma200: 295.2,
    rsi: 62.5,
    macdSignal: 'bullish',
    volumeChange: 22.5,
  },
  {
    symbol: 'ABBV',
    name: 'AbbVie Inc.',
    sector: 'Healthcare',
    industry: 'Drug Manufacturers',
    marketCap: 310000000000,
    price: 175.5,
    change: 1.15,
    changePercent: 0.66,
    per: 18.5,
    pbr: 28.5,
    peg: 2.2,
    psRatio: 5.5,
    roe: 72.5,
    epsGrowth3Y: 8.5,
    epsGrowth5Y: 12.5,
    revenueGrowth: 5.5,
    operatingMargin: 32.5,
    equityRatio: 8.5,
    currentRatio: 0.9,
    debtRatio: 85.5,
    operatingCF: 22000000000,
    dividendYield: 3.8,
    consecutiveDividendYears: 51,
    payoutRatio: 68.0,
    sma50: 170.5,
    sma200: 158.2,
    rsi: 58.5,
    macdSignal: 'bullish',
    volumeChange: 5.5,
  },
  {
    symbol: 'COST',
    name: 'Costco Wholesale Corporation',
    sector: 'Consumer Defensive',
    industry: 'Discount Stores',
    marketCap: 320000000000,
    price: 725.5,
    change: 8.25,
    changePercent: 1.15,
    per: 48.5,
    pbr: 14.5,
    peg: 3.8,
    psRatio: 1.4,
    roe: 28.5,
    epsGrowth3Y: 12.5,
    epsGrowth5Y: 14.2,
    revenueGrowth: 8.5,
    operatingMargin: 3.5,
    equityRatio: 35.5,
    currentRatio: 1.0,
    debtRatio: 42.5,
    operatingCF: 8500000000,
    dividendYield: 0.6,
    consecutiveDividendYears: 19,
    payoutRatio: 28.0,
    sma50: 710.5,
    sma200: 685.2,
    rsi: 62.5,
    macdSignal: 'bullish',
    volumeChange: 12.5,
  },
];

// Apply enrichment to add new fields
const SAMPLE_STOCKS: StockFundamentals[] = SAMPLE_STOCKS_RAW.map(enrichStockData);

/**
 * リアルタイム株価を取得してサンプルデータを更新
 * Alpha Vantage → Yahoo Finance フォールバックロジックを使用
 */
async function updateStockPricesFromAPI(
  stocks: StockFundamentals[]
): Promise<StockFundamentals[]> {
  const updatedStocks = await Promise.all(
    stocks.map(async (stock) => {
      try {
        // 共通ユーティリティを使用してリアルタイム株価を取得
        const quote = await fetchStockQuote(stock.symbol);

        // リアルタイム価格でサンプルデータを更新
        return {
          ...stock,
          price: quote.price,
          change: quote.change,
          changePercent: quote.changePercent,
        };
      } catch (error) {
        console.warn(
          `Error fetching price for ${stock.symbol}:`,
          error instanceof Error ? error.message : error
        );
        return stock; // エラー時はサンプルデータを使用
      }
    })
  );

  return updatedStocks;
}

// Get competitors in same sector
function getCompetitors(stock: StockFundamentals, allStocks: StockFundamentals[]): ScreenerResult[] {
  return allStocks
    .filter((s) => s.sector === stock.sector && s.symbol !== stock.symbol)
    .slice(0, 5)
    .map((s) => ({ ...s, score: calculateScore(s) }));
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ ticker: string }> }
) {
  try {
    const { ticker } = await params;
    const symbol = ticker.toUpperCase();

    // リアルタイム株価を取得
    console.log(`[Ticker] Fetching real-time prices for ${symbol}...`);
    const stocksWithRealPrices = await updateStockPricesFromAPI(SAMPLE_STOCKS);
    console.log(`[Ticker] Real-time prices fetched`);

    const stock = stocksWithRealPrices.find((s) => s.symbol === symbol);

    if (!stock) {
      return NextResponse.json(
        { success: false, error: '銘柄が見つかりません' },
        { status: 404 }
      );
    }

    const result: ScreenerResult = {
      ...stock,
      score: calculateScore(stock),
    };

    const competitors = getCompetitors(stock, stocksWithRealPrices);

    return NextResponse.json({
      success: true,
      stock: result,
      competitors,
    });
  } catch (error) {
    console.error('Stock detail API error:', error);
    return NextResponse.json(
      { success: false, error: '銘柄情報の取得中にエラーが発生しました' },
      { status: 500 }
    );
  }
}
