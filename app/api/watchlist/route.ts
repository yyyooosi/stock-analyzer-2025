import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import {
  getUserWatchlist,
  addToWatchlistDb,
  removeFromWatchlistDb,
} from '@/app/utils/database';
import {
  checkRateLimit,
  getClientIdentifier,
  RateLimitConfigs,
  createRateLimitHeaders,
} from '@/app/utils/rateLimit';
import {
  isValidStockSymbol,
  sanitizeStockSymbol,
} from '@/app/utils/validation';

// ウォッチリストを取得
export async function GET(request: NextRequest) {
  // Rate limiting
  const clientId = getClientIdentifier(request);
  const rateLimitResult = checkRateLimit(clientId, RateLimitConfigs.watchlist);

  if (!rateLimitResult.allowed) {
    return NextResponse.json(
      { error: 'Rate limit exceeded' },
      { status: 429, headers: createRateLimitHeaders(rateLimitResult) }
    );
  }

  try {
    let session;
    try {
      session = await auth();
    } catch (authError) {
      console.error('[Watchlist] 認証エラー');
      return NextResponse.json(
        { error: '認証が必要です' },
        { status: 401, headers: createRateLimitHeaders(rateLimitResult) }
      );
    }

    if (!session?.user?.email) {
      return NextResponse.json(
        { error: '認証が必要です' },
        { status: 401, headers: createRateLimitHeaders(rateLimitResult) }
      );
    }

    const watchlist = await getUserWatchlist(session.user.email);
    console.log(`[Watchlist API] Retrieved ${watchlist.length} items`);

    const responseItems = watchlist.map(item => ({
      symbol: item.symbol,
      addedAt: item.added_at,
    }));

    return NextResponse.json(
      { items: responseItems },
      { headers: createRateLimitHeaders(rateLimitResult) }
    );
  } catch (error) {
    console.error('[Watchlist] 取得エラー');
    return NextResponse.json(
      { error: 'ウォッチリストの取得に失敗しました' },
      { status: 500, headers: createRateLimitHeaders(rateLimitResult) }
    );
  }
}

// ウォッチリストに銘柄を追加
export async function POST(request: NextRequest) {
  // Rate limiting
  const clientId = getClientIdentifier(request);
  const rateLimitResult = checkRateLimit(clientId, RateLimitConfigs.watchlist);

  if (!rateLimitResult.allowed) {
    return NextResponse.json(
      { error: 'Rate limit exceeded' },
      { status: 429, headers: createRateLimitHeaders(rateLimitResult) }
    );
  }

  try {
    let session;
    try {
      session = await auth();
    } catch (authError) {
      console.error('[Watchlist] 認証エラー');
      return NextResponse.json(
        { error: '認証が必要です' },
        { status: 401, headers: createRateLimitHeaders(rateLimitResult) }
      );
    }

    if (!session?.user?.email) {
      return NextResponse.json(
        { error: '認証が必要です' },
        { status: 401, headers: createRateLimitHeaders(rateLimitResult) }
      );
    }

    const body = await request.json();
    const { symbol: symbolParam } = body;

    if (!symbolParam || typeof symbolParam !== 'string') {
      return NextResponse.json(
        { error: '銘柄シンボルが必要です' },
        { status: 400, headers: createRateLimitHeaders(rateLimitResult) }
      );
    }

    // Validate and sanitize symbol
    if (!isValidStockSymbol(symbolParam)) {
      return NextResponse.json(
        { error: '無効な銘柄シンボル形式です' },
        { status: 400, headers: createRateLimitHeaders(rateLimitResult) }
      );
    }

    const symbol = sanitizeStockSymbol(symbolParam);
    const added = await addToWatchlistDb(session.user.email, symbol);

    if (!added) {
      return NextResponse.json(
        { error: 'この銘柄は既にウォッチリストに登録されています' },
        { status: 409, headers: createRateLimitHeaders(rateLimitResult) }
      );
    }

    return NextResponse.json(
      { success: true },
      { headers: createRateLimitHeaders(rateLimitResult) }
    );
  } catch (error) {
    console.error('[Watchlist] 追加エラー');
    return NextResponse.json(
      { error: 'ウォッチリストへの追加に失敗しました' },
      { status: 500, headers: createRateLimitHeaders(rateLimitResult) }
    );
  }
}

// ウォッチリストから銘柄を削除
export async function DELETE(request: NextRequest) {
  // Rate limiting
  const clientId = getClientIdentifier(request);
  const rateLimitResult = checkRateLimit(clientId, RateLimitConfigs.watchlist);

  if (!rateLimitResult.allowed) {
    return NextResponse.json(
      { error: 'Rate limit exceeded' },
      { status: 429, headers: createRateLimitHeaders(rateLimitResult) }
    );
  }

  try {
    let session;
    try {
      session = await auth();
    } catch (authError) {
      console.error('[Watchlist] 認証エラー');
      return NextResponse.json(
        { error: '認証が必要です' },
        { status: 401, headers: createRateLimitHeaders(rateLimitResult) }
      );
    }

    if (!session?.user?.email) {
      return NextResponse.json(
        { error: '認証が必要です' },
        { status: 401, headers: createRateLimitHeaders(rateLimitResult) }
      );
    }

    const { searchParams } = new URL(request.url);
    const symbolParam = searchParams.get('symbol');

    if (!symbolParam) {
      return NextResponse.json(
        { error: '銘柄シンボルが必要です' },
        { status: 400, headers: createRateLimitHeaders(rateLimitResult) }
      );
    }

    // Validate and sanitize symbol
    if (!isValidStockSymbol(symbolParam)) {
      return NextResponse.json(
        { error: '無効な銘柄シンボル形式です' },
        { status: 400, headers: createRateLimitHeaders(rateLimitResult) }
      );
    }

    const symbol = sanitizeStockSymbol(symbolParam);
    const removed = await removeFromWatchlistDb(session.user.email, symbol);

    if (!removed) {
      return NextResponse.json(
        { error: 'この銘柄はウォッチリストに登録されていません' },
        { status: 404, headers: createRateLimitHeaders(rateLimitResult) }
      );
    }

    return NextResponse.json(
      { success: true },
      { headers: createRateLimitHeaders(rateLimitResult) }
    );
  } catch (error) {
    console.error('[Watchlist] 削除エラー');
    return NextResponse.json(
      { error: 'ウォッチリストからの削除に失敗しました' },
      { status: 500, headers: createRateLimitHeaders(rateLimitResult) }
    );
  }
}
