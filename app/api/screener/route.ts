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
  console.log('[Screener] Starting fetchStocksFromFMP...');
  const apiKey = process.env.FMP_API_KEY;

  if (!apiKey) {
    console.error('[Screener] FMP_API_KEY is NOT configured in environment variables');
    throw new Error('FMP_API_KEY is not configured. Please set the environment variable.');
  }

  console.log('[Screener] FMP_API_KEY is configured:', `${apiKey.substring(0, 4)}...${apiKey.substring(apiKey.length - 4)}`);

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

  console.log('[Screener] FMP params:', JSON.stringify(fmpParams, null, 2));
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
    console.log('[Screener] Environment: ', process.env.NODE_ENV);
    console.log('[Screener] Vercel URL: ', process.env.VERCEL_URL || 'Not on Vercel');

    const stocks = await fetchStocksFromFMP(filters);

    if (stocks.length === 0) {
      console.error('[Screener] No stocks returned from FMP API');
      return NextResponse.json({
        success: false,
        error: 'FMP APIから株式データを取得できませんでした。',
        details: 'APIキーが正しく設定されているか、またはAPI制限に達していないか確認してください。',
        count: 0,
        results: [],
      }, { status: 500 });
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
    console.error('[Screener] API error:', error);

    // Detailed error logging for production debugging
    if (error instanceof Error) {
      console.error('[Screener] Error name:', error.name);
      console.error('[Screener] Error message:', error.message);
      console.error('[Screener] Error stack:', error.stack);
    }

    // Check if it's an API key error
    if (error instanceof Error && error.message.includes('FMP_API_KEY')) {
      return NextResponse.json(
        {
          success: false,
          error: 'FMP APIキーが設定されていません',
          details: '環境変数FMP_API_KEYを設定してください。',
          hint: 'https://financialmodelingprep.com/developer/docs でAPIキーを取得できます（無料プラン: 250リクエスト/日）',
          errorType: 'API_KEY_MISSING',
        },
        { status: 500 }
      );
    }

    // Check for network errors
    if (error instanceof Error && (error.message.includes('fetch') || error.message.includes('network'))) {
      return NextResponse.json(
        {
          success: false,
          error: 'FMP APIへの接続に失敗しました',
          details: 'ネットワーク接続を確認してください。',
          errorType: 'NETWORK_ERROR',
        },
        { status: 503 }
      );
    }

    // Check for rate limit errors
    if (error instanceof Error && error.message.includes('429')) {
      return NextResponse.json(
        {
          success: false,
          error: 'API呼び出し制限に達しました',
          details: 'FMP APIの無料プランは250リクエスト/日です。時間をおいて再度お試しください。',
          errorType: 'RATE_LIMIT',
        },
        { status: 429 }
      );
    }

    // Check for forbidden/deprecated endpoint errors
    if (error instanceof Error && error.message.includes('403')) {
      return NextResponse.json(
        {
          success: false,
          error: 'FMP APIエンドポイントが利用できません',
          details: 'APIエンドポイントが非推奨になったか、有料プランが必要な可能性があります。',
          errorType: 'FORBIDDEN',
        },
        { status: 403 }
      );
    }

    // Generic error
    return NextResponse.json(
      {
        success: false,
        error: 'データの取得に失敗しました',
        details: error instanceof Error ? error.message : 'スクリーニング処理中に予期しないエラーが発生しました。',
        errorType: 'UNKNOWN_ERROR',
      },
      { status: 500 }
    );
  }
}
