import { NextRequest, NextResponse } from 'next/server';
import { searchSymbols, getSymbolsByCategory, isValidSymbol, getSymbolInfo } from '@/app/utils/stockSymbols';

// GET /api/stock/symbols?q=<query>&limit=<limit>
// または GET /api/stock/symbols?category=true
// または GET /api/stock/symbols?validate=<symbol>
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const query = searchParams.get('q');
    const limitParam = searchParams.get('limit');
    const category = searchParams.get('category');
    const validateSymbol = searchParams.get('validate');

    // カテゴリ別取得
    if (category === 'true') {
      const categories = getSymbolsByCategory();
      return NextResponse.json(categories);
    }

    // シンボルの検証
    if (validateSymbol) {
      const symbol = validateSymbol.toUpperCase();
      const isValid = isValidSymbol(symbol);
      const info = getSymbolInfo(symbol);
      return NextResponse.json({
        valid: isValid,
        symbol: symbol,
        info: info || null,
      });
    }

    // 検索
    const limit = limitParam ? parseInt(limitParam, 10) : 10;
    const results = searchSymbols(query || '', limit);

    return NextResponse.json({
      query: query || '',
      results,
      count: results.length,
    });

  } catch (error) {
    console.error('Symbol search error:', error);
    return NextResponse.json(
      { error: 'シンボル検索に失敗しました' },
      { status: 500 }
    );
  }
}
