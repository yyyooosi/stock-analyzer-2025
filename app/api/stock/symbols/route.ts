import { NextResponse } from 'next/server';
import {
  getCachedSymbols,
  fetchSymbolsFromAlphaVantage,
  StockSymbol
} from '@/app/utils/symbolsCache';

const ALPHA_VANTAGE_API_KEY = process.env.ALPHA_VANTAGE_API_KEY;

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    if (!ALPHA_VANTAGE_API_KEY) {
      console.error('ALPHA_VANTAGE_API_KEY is not configured');
      return NextResponse.json(
        { error: 'APIキーが設定されていません' },
        { status: 500 }
      );
    }

    // キャッシュからシンボルを取得（必要に応じて更新）
    const symbols = await getCachedSymbols(async () => {
      return await fetchSymbolsFromAlphaVantage(ALPHA_VANTAGE_API_KEY!);
    });

    return NextResponse.json({
      symbols,
      count: symbols.length
    });

  } catch (error) {
    console.error('Stock symbols fetch error:', error);
    return NextResponse.json(
      {
        error: '銘柄リストの取得中にエラーが発生しました',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
