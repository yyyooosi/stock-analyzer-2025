import { NextResponse } from 'next/server';
import popularStocks from '@/app/data/popular-stocks.json';

export const dynamic = 'force-dynamic';

export interface StockSymbol {
  symbol: string;
  name: string;
  exchange: string;
}

export async function GET() {
  try {
    // 静的な人気銘柄リストを返す
    const symbols: StockSymbol[] = popularStocks.map(stock => ({
      symbol: stock.symbol,
      name: stock.name,
      exchange: stock.exchange
    }));

    console.log(`[SymbolsAPI] Returning ${symbols.length} stock symbols`);

    return NextResponse.json({
      symbols,
      count: symbols.length,
      source: 'static'
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
