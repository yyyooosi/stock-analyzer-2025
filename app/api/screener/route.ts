import { NextRequest, NextResponse } from 'next/server';
import {
  ScreenerFilters,
  StockFundamentals,
  ScreenerResult,
  calculateScore,
  matchesFilters,
} from '@/app/utils/screener';
import { fetchFMPComprehensiveStockData, FMPScreenerParams } from '@/app/utils/fmpApi';
import { mapFMPDataArrayToStockFundamentals, filterStocksWithSufficientData } from '@/app/utils/fmpMapper';

/**
 * FMP APIから全米国株のデータを取得
 * @param filters - ユーザーのフィルター条件
 * @returns 株式データの配列
 */
async function fetchStocksFromFMP(filters: ScreenerFilters): Promise<StockFundamentals[]> {
  const apiKey = process.env.FMP_API_KEY;

  if (!apiKey) {
    throw new Error('FMP_API_KEY is not configured. Please set the environment variable.');
  }

  // Build FMP screener parameters from user filters
  const fmpParams: FMPScreenerParams = {
    // Only get actively trading US stocks
    isActivelyTrading: true,
    exchange: undefined, // Include all US exchanges (NYSE, NASDAQ, AMEX)

    // Market cap filters
    marketCapMoreThan: filters.marketCapMin || filters.marketCapUSDMin || 100_000_000, // Default: $100M minimum
    marketCapLowerThan: filters.marketCapMax || filters.marketCapUSDMax,

    // Dividend filters
    dividendMoreThan: filters.dividendYieldMin ? filters.dividendYieldMin / 100 : undefined,
    dividendLowerThan: filters.dividendYieldMax ? filters.dividendYieldMax / 100 : undefined,

    // Sector filter
    sector: filters.sectors && filters.sectors.length === 1 ? filters.sectors[0] : undefined,

    // Set a reasonable limit to avoid excessive API calls
    // Users can refine results with additional filters
    limit: 1000, // FMP allows up to 1000 results per request
  };

  console.log('[Screener] Fetching stocks from FMP API...');
  const fmpData = await fetchFMPComprehensiveStockData(fmpParams);

  if (fmpData.length === 0) {
    console.log('[Screener] No stocks found from FMP API');
    return [];
  }

  // Map FMP data to StockFundamentals format
  const stocks = mapFMPDataArrayToStockFundamentals(fmpData);

  // Filter out stocks with insufficient data
  const validStocks = filterStocksWithSufficientData(stocks);

  console.log(`[Screener] FMP API returned ${validStocks.length} valid stocks`);

  return validStocks;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    // Parse filters from query params
    const filters: ScreenerFilters = {};

    // Parse numeric filters
    const numericParams = [
      'perMin',
      'perMax',
      'pbrMin',
      'pbrMax',
      'pegMin',
      'pegMax',
      'roeMin',
      'epsGrowth3YMin',
      'epsGrowth5YMin',
      'revenueGrowthMin',
      'revenueGrowthMax',
      'operatingMarginMin',
      'grossMarginMin',
      'forwardPERMin',
      'forwardPERMax',
      'evEbitdaMin',
      'evEbitdaMax',
      'rdExpenseRatioMin',
      'rdExpenseRatioMax',
      'equityRatioMin',
      'currentRatioMin',
      'debtRatioMax',
      'debtToEquityMax',
      'dividendYieldMin',
      'dividendYieldMax',
      'consecutiveDividendYearsMin',
      'payoutRatioMax',
      'payoutRatioMin',
      'rsiMin',
      'rsiMax',
      'volumeIncreasePercent',
      'week52HighDistanceMax',
      'marketCapMin',
      'marketCapMax',
      'marketCapUSDMin',
      'marketCapUSDMax',
    ];

    for (const param of numericParams) {
      const value = searchParams.get(param);
      if (value !== null) {
        (filters as Record<string, number>)[param] = parseFloat(value);
      }
    }

    // Parse boolean filters
    const booleanParams = [
      'operatingCFPositive',
      'freeCashFlowPositive',
      'freeCashFlow3YPositive',
      'aboveSMA50',
      'aboveSMA200',
      'goldenCross',
      'macdBullish',
      'twitterMentionTrendPositive',
      'excludeNegativeKeywords',
    ];
    for (const param of booleanParams) {
      const value = searchParams.get(param);
      if (value !== null) {
        (filters as Record<string, boolean>)[param] = value === 'true';
      }
    }

    // Parse string enum filters
    const twitterSentiment = searchParams.get('twitterSentimentFilter');
    if (twitterSentiment && ['positive', 'neutral', 'negative', 'any'].includes(twitterSentiment)) {
      filters.twitterSentimentFilter = twitterSentiment as 'positive' | 'neutral' | 'negative' | 'any';
    }

    // Parse array filters
    const sectors = searchParams.get('sectors');
    if (sectors) {
      filters.sectors = sectors.split(',');
    }

    const themes = searchParams.get('themes');
    if (themes) {
      filters.themes = themes.split(',');
    }

    // Fetch stocks from FMP API
    console.log('[Screener] Starting stock data fetch...');
    const stocks = await fetchStocksFromFMP(filters);

    if (stocks.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'FMP APIから株式データを取得できませんでした。FMP_API_KEYが正しく設定されているか確認してください。',
        count: 0,
        results: [],
      });
    }

    console.log(`[Screener] Processing ${stocks.length} stocks with filters...`);

    // Filter and score stocks
    const results: ScreenerResult[] = stocks
      .filter((stock) => matchesFilters(stock, filters))
      .map((stock) => ({
        ...stock,
        score: calculateScore(stock),
      }));

    // Sort by total score (descending)
    results.sort((a, b) => b.score.total - a.score.total);

    return NextResponse.json({
      success: true,
      count: results.length,
      results,
    });
  } catch (error) {
    console.error('Screener API error:', error);

    // Check if it's an API key error
    if (error instanceof Error && error.message.includes('FMP_API_KEY')) {
      return NextResponse.json(
        {
          success: false,
          error: 'FMP APIキーが設定されていません。環境変数FMP_API_KEYを設定してください。',
          hint: 'https://financialmodelingprep.com/developer/docs でAPIキーを取得できます（無料プラン: 250リクエスト/日）',
        },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        success: false,
        error: 'スクリーニング処理中にエラーが発生しました。FMP APIへの接続を確認してください。',
      },
      { status: 500 }
    );
  }
}
