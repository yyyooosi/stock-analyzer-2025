import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import {
  getUserWatchlist,
  addToWatchlistDb,
  removeFromWatchlistDb,
} from '@/app/utils/database';

// ウォッチリストを取得
export async function GET() {
  try {
    const session = await auth();

    if (!session?.user?.email) {
      return NextResponse.json(
        { error: '認証が必要です' },
        { status: 401 }
      );
    }

    const watchlist = getUserWatchlist(session.user.email);

    return NextResponse.json({
      items: watchlist.map(item => ({
        symbol: item.symbol,
        addedAt: item.added_at,
      })),
    });
  } catch (error) {
    console.error('ウォッチリスト取得エラー:', error);
    return NextResponse.json(
      { error: 'ウォッチリストの取得に失敗しました' },
      { status: 500 }
    );
  }
}

// ウォッチリストに銘柄を追加
export async function POST(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.email) {
      return NextResponse.json(
        { error: '認証が必要です' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { symbol } = body;

    if (!symbol || typeof symbol !== 'string') {
      return NextResponse.json(
        { error: '銘柄シンボルが必要です' },
        { status: 400 }
      );
    }

    const added = addToWatchlistDb(session.user.email, symbol);

    if (!added) {
      return NextResponse.json(
        { error: 'この銘柄は既にウォッチリストに登録されています' },
        { status: 409 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('ウォッチリスト追加エラー:', error);
    return NextResponse.json(
      { error: 'ウォッチリストへの追加に失敗しました' },
      { status: 500 }
    );
  }
}

// ウォッチリストから銘柄を削除
export async function DELETE(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.email) {
      return NextResponse.json(
        { error: '認証が必要です' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const symbol = searchParams.get('symbol');

    if (!symbol) {
      return NextResponse.json(
        { error: '銘柄シンボルが必要です' },
        { status: 400 }
      );
    }

    const removed = removeFromWatchlistDb(session.user.email, symbol);

    if (!removed) {
      return NextResponse.json(
        { error: 'この銘柄はウォッチリストに登録されていません' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('ウォッチリスト削除エラー:', error);
    return NextResponse.json(
      { error: 'ウォッチリストからの削除に失敗しました' },
      { status: 500 }
    );
  }
}
