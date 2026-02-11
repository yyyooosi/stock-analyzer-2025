import { NextRequest, NextResponse } from 'next/server';
import {
  checkRateLimit,
  getClientIdentifier,
  RateLimitConfigs,
  createRateLimitHeaders,
} from '@/app/utils/rateLimit';
import {
  getLatestSentiment,
  getLatestSentiments,
  initializeSentimentTable,
} from '@/app/utils/database';
import { isValidStockSymbol, sanitizeStockSymbol } from '@/app/utils/validation';

/**
 * GET /api/twitter/sentiment?symbol=AAPL
 * GET /api/twitter/sentiment?symbols=AAPL,TSLA,NVDA
 *
 * バッチ処理で保存済みのセンチメント結果を取得する。
 * symbol: 1銘柄の最新結果
 * symbols: 複数銘柄の最新結果を一括取得
 */
export async function GET(request: NextRequest) {
  const clientId = getClientIdentifier(request);
  const rateLimitResult = checkRateLimit(clientId, RateLimitConfigs.twitter);

  if (!rateLimitResult.allowed) {
    return NextResponse.json(
      { error: 'Rate limit exceeded. Please try again later.' },
      { status: 429, headers: createRateLimitHeaders(rateLimitResult) }
    );
  }

  try {
    await initializeSentimentTable();

    const searchParams = request.nextUrl.searchParams;
    const symbolParam = searchParams.get('symbol');
    const symbolsParam = searchParams.get('symbols');

    // 複数銘柄の一括取得
    if (symbolsParam) {
      const symbols = symbolsParam
        .split(',')
        .map((s: string) => s.trim())
        .filter((s: string) => isValidStockSymbol(s))
        .map((s: string) => sanitizeStockSymbol(s));

      if (symbols.length === 0) {
        return NextResponse.json(
          { error: '有効な銘柄シンボルを指定してください' },
          { status: 400, headers: createRateLimitHeaders(rateLimitResult) }
        );
      }

      const results = await getLatestSentiments(symbols);

      return NextResponse.json(
        { data: results },
        { headers: createRateLimitHeaders(rateLimitResult) }
      );
    }

    // 単一銘柄の取得
    if (!symbolParam) {
      return NextResponse.json(
        { error: 'symbol または symbols パラメータが必要です' },
        { status: 400, headers: createRateLimitHeaders(rateLimitResult) }
      );
    }

    if (!isValidStockSymbol(symbolParam)) {
      return NextResponse.json(
        { error: '無効な銘柄シンボルです' },
        { status: 400, headers: createRateLimitHeaders(rateLimitResult) }
      );
    }

    const symbol = sanitizeStockSymbol(symbolParam);
    const result = await getLatestSentiment(symbol);

    if (!result) {
      return NextResponse.json(
        { data: null, message: 'センチメントデータがまだありません' },
        { headers: createRateLimitHeaders(rateLimitResult) }
      );
    }

    return NextResponse.json(
      { data: result },
      { headers: createRateLimitHeaders(rateLimitResult) }
    );
  } catch (error) {
    console.error('[Sentiment API] エラー:', error);
    return NextResponse.json(
      { error: 'センチメントデータの取得に失敗しました' },
      { status: 500 }
    );
  }
}
