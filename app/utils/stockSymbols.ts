// 株式シンボルの情報
export interface StockSymbol {
  symbol: string;
  name: string;
  exchange?: string;
}

// 主要な米国株式シンボルのリスト
export const POPULAR_STOCK_SYMBOLS: StockSymbol[] = [
  // テクノロジー
  { symbol: 'AAPL', name: 'Apple Inc.', exchange: 'NASDAQ' },
  { symbol: 'MSFT', name: 'Microsoft Corporation', exchange: 'NASDAQ' },
  { symbol: 'GOOGL', name: 'Alphabet Inc. (Class A)', exchange: 'NASDAQ' },
  { symbol: 'GOOG', name: 'Alphabet Inc. (Class C)', exchange: 'NASDAQ' },
  { symbol: 'AMZN', name: 'Amazon.com Inc.', exchange: 'NASDAQ' },
  { symbol: 'META', name: 'Meta Platforms Inc.', exchange: 'NASDAQ' },
  { symbol: 'TSLA', name: 'Tesla Inc.', exchange: 'NASDAQ' },
  { symbol: 'NVDA', name: 'NVIDIA Corporation', exchange: 'NASDAQ' },
  { symbol: 'NFLX', name: 'Netflix Inc.', exchange: 'NASDAQ' },
  { symbol: 'INTC', name: 'Intel Corporation', exchange: 'NASDAQ' },
  { symbol: 'AMD', name: 'Advanced Micro Devices Inc.', exchange: 'NASDAQ' },
  { symbol: 'CRM', name: 'Salesforce Inc.', exchange: 'NYSE' },
  { symbol: 'ORCL', name: 'Oracle Corporation', exchange: 'NYSE' },
  { symbol: 'ADBE', name: 'Adobe Inc.', exchange: 'NASDAQ' },
  { symbol: 'CSCO', name: 'Cisco Systems Inc.', exchange: 'NASDAQ' },
  { symbol: 'AVGO', name: 'Broadcom Inc.', exchange: 'NASDAQ' },
  { symbol: 'QCOM', name: 'QUALCOMM Incorporated', exchange: 'NASDAQ' },
  { symbol: 'TXN', name: 'Texas Instruments Incorporated', exchange: 'NASDAQ' },
  { symbol: 'IBM', name: 'International Business Machines Corporation', exchange: 'NYSE' },

  // 金融
  { symbol: 'JPM', name: 'JPMorgan Chase & Co.', exchange: 'NYSE' },
  { symbol: 'BAC', name: 'Bank of America Corporation', exchange: 'NYSE' },
  { symbol: 'WFC', name: 'Wells Fargo & Company', exchange: 'NYSE' },
  { symbol: 'GS', name: 'The Goldman Sachs Group Inc.', exchange: 'NYSE' },
  { symbol: 'MS', name: 'Morgan Stanley', exchange: 'NYSE' },
  { symbol: 'V', name: 'Visa Inc.', exchange: 'NYSE' },
  { symbol: 'MA', name: 'Mastercard Incorporated', exchange: 'NYSE' },
  { symbol: 'AXP', name: 'American Express Company', exchange: 'NYSE' },
  { symbol: 'BLK', name: 'BlackRock Inc.', exchange: 'NYSE' },
  { symbol: 'SCHW', name: 'The Charles Schwab Corporation', exchange: 'NYSE' },

  // ヘルスケア
  { symbol: 'JNJ', name: 'Johnson & Johnson', exchange: 'NYSE' },
  { symbol: 'UNH', name: 'UnitedHealth Group Incorporated', exchange: 'NYSE' },
  { symbol: 'PFE', name: 'Pfizer Inc.', exchange: 'NYSE' },
  { symbol: 'ABBV', name: 'AbbVie Inc.', exchange: 'NYSE' },
  { symbol: 'TMO', name: 'Thermo Fisher Scientific Inc.', exchange: 'NYSE' },
  { symbol: 'MRK', name: 'Merck & Co. Inc.', exchange: 'NYSE' },
  { symbol: 'LLY', name: 'Eli Lilly and Company', exchange: 'NYSE' },
  { symbol: 'ABT', name: 'Abbott Laboratories', exchange: 'NYSE' },
  { symbol: 'DHR', name: 'Danaher Corporation', exchange: 'NYSE' },

  // 消費財
  { symbol: 'WMT', name: 'Walmart Inc.', exchange: 'NYSE' },
  { symbol: 'PG', name: 'The Procter & Gamble Company', exchange: 'NYSE' },
  { symbol: 'KO', name: 'The Coca-Cola Company', exchange: 'NYSE' },
  { symbol: 'PEP', name: 'PepsiCo Inc.', exchange: 'NASDAQ' },
  { symbol: 'COST', name: 'Costco Wholesale Corporation', exchange: 'NASDAQ' },
  { symbol: 'NKE', name: 'NIKE Inc.', exchange: 'NYSE' },
  { symbol: 'MCD', name: "McDonald's Corporation", exchange: 'NYSE' },
  { symbol: 'SBUX', name: 'Starbucks Corporation', exchange: 'NASDAQ' },
  { symbol: 'DIS', name: 'The Walt Disney Company', exchange: 'NYSE' },
  { symbol: 'HD', name: 'The Home Depot Inc.', exchange: 'NYSE' },
  { symbol: 'LOW', name: "Lowe's Companies Inc.", exchange: 'NYSE' },
  { symbol: 'TGT', name: 'Target Corporation', exchange: 'NYSE' },

  // エネルギー
  { symbol: 'XOM', name: 'Exxon Mobil Corporation', exchange: 'NYSE' },
  { symbol: 'CVX', name: 'Chevron Corporation', exchange: 'NYSE' },
  { symbol: 'COP', name: 'ConocoPhillips', exchange: 'NYSE' },
  { symbol: 'SLB', name: 'Schlumberger Limited', exchange: 'NYSE' },

  // 通信
  { symbol: 'T', name: 'AT&T Inc.', exchange: 'NYSE' },
  { symbol: 'VZ', name: 'Verizon Communications Inc.', exchange: 'NYSE' },
  { symbol: 'TMUS', name: 'T-Mobile US Inc.', exchange: 'NASDAQ' },

  // 工業
  { symbol: 'BA', name: 'The Boeing Company', exchange: 'NYSE' },
  { symbol: 'CAT', name: 'Caterpillar Inc.', exchange: 'NYSE' },
  { symbol: 'GE', name: 'General Electric Company', exchange: 'NYSE' },
  { symbol: 'MMM', name: '3M Company', exchange: 'NYSE' },
  { symbol: 'HON', name: 'Honeywell International Inc.', exchange: 'NASDAQ' },
  { symbol: 'UPS', name: 'United Parcel Service Inc.', exchange: 'NYSE' },
  { symbol: 'LMT', name: 'Lockheed Martin Corporation', exchange: 'NYSE' },

  // その他人気銘柄
  { symbol: 'BABA', name: 'Alibaba Group Holding Limited', exchange: 'NYSE' },
  { symbol: 'UBER', name: 'Uber Technologies Inc.', exchange: 'NYSE' },
  { symbol: 'LYFT', name: 'Lyft Inc.', exchange: 'NASDAQ' },
  { symbol: 'ABNB', name: 'Airbnb Inc.', exchange: 'NASDAQ' },
  { symbol: 'COIN', name: 'Coinbase Global Inc.', exchange: 'NASDAQ' },
  { symbol: 'SHOP', name: 'Shopify Inc.', exchange: 'NYSE' },
  { symbol: 'SNAP', name: 'Snap Inc.', exchange: 'NYSE' },
  { symbol: 'TWTR', name: 'Twitter Inc.', exchange: 'NYSE' },
  { symbol: 'SQ', name: 'Block Inc.', exchange: 'NYSE' },
  { symbol: 'PYPL', name: 'PayPal Holdings Inc.', exchange: 'NASDAQ' },
  { symbol: 'ZM', name: 'Zoom Video Communications Inc.', exchange: 'NASDAQ' },
  { symbol: 'ROKU', name: 'Roku Inc.', exchange: 'NASDAQ' },
  { symbol: 'SPOT', name: 'Spotify Technology S.A.', exchange: 'NYSE' },

  // ETF
  { symbol: 'SPY', name: 'SPDR S&P 500 ETF Trust', exchange: 'NYSE' },
  { symbol: 'QQQ', name: 'Invesco QQQ Trust', exchange: 'NASDAQ' },
  { symbol: 'DIA', name: 'SPDR Dow Jones Industrial Average ETF Trust', exchange: 'NYSE' },
  { symbol: 'IWM', name: 'iShares Russell 2000 ETF', exchange: 'NYSE' },
  { symbol: 'VTI', name: 'Vanguard Total Stock Market ETF', exchange: 'NYSE' },
];

// シンボルマップ（高速検索用）
const symbolMap = new Map<string, StockSymbol>(
  POPULAR_STOCK_SYMBOLS.map(stock => [stock.symbol, stock])
);

/**
 * シンボルが有効かどうかをチェック
 */
export function isValidSymbol(symbol: string): boolean {
  return symbolMap.has(symbol.toUpperCase());
}

/**
 * シンボルの情報を取得
 */
export function getSymbolInfo(symbol: string): StockSymbol | undefined {
  return symbolMap.get(symbol.toUpperCase());
}

/**
 * 部分一致でシンボルを検索（オートコンプリート用）
 */
export function searchSymbols(query: string, limit: number = 10): StockSymbol[] {
  if (!query || query.trim().length === 0) {
    return POPULAR_STOCK_SYMBOLS.slice(0, limit);
  }

  const upperQuery = query.toUpperCase();
  const results: StockSymbol[] = [];

  // シンボルで完全一致するものを最優先
  const exactMatch = symbolMap.get(upperQuery);
  if (exactMatch) {
    results.push(exactMatch);
  }

  // シンボルで前方一致するものを次に優先
  for (const stock of POPULAR_STOCK_SYMBOLS) {
    if (results.length >= limit) break;
    if (stock.symbol.startsWith(upperQuery) && stock.symbol !== upperQuery) {
      results.push(stock);
    }
  }

  // 名前で部分一致するものを追加
  for (const stock of POPULAR_STOCK_SYMBOLS) {
    if (results.length >= limit) break;
    if (
      !results.includes(stock) &&
      stock.name.toUpperCase().includes(upperQuery)
    ) {
      results.push(stock);
    }
  }

  // シンボルに部分一致するものを最後に追加
  for (const stock of POPULAR_STOCK_SYMBOLS) {
    if (results.length >= limit) break;
    if (
      !results.includes(stock) &&
      stock.symbol.includes(upperQuery)
    ) {
      results.push(stock);
    }
  }

  return results;
}

/**
 * カテゴリ別にシンボルを取得
 */
export function getSymbolsByCategory(): { [category: string]: StockSymbol[] } {
  return {
    'テクノロジー': POPULAR_STOCK_SYMBOLS.filter(s =>
      ['AAPL', 'MSFT', 'GOOGL', 'GOOG', 'AMZN', 'META', 'TSLA', 'NVDA', 'NFLX', 'INTC', 'AMD', 'CRM', 'ORCL', 'ADBE', 'CSCO', 'AVGO', 'QCOM', 'TXN', 'IBM'].includes(s.symbol)
    ),
    '金融': POPULAR_STOCK_SYMBOLS.filter(s =>
      ['JPM', 'BAC', 'WFC', 'GS', 'MS', 'V', 'MA', 'AXP', 'BLK', 'SCHW'].includes(s.symbol)
    ),
    'ヘルスケア': POPULAR_STOCK_SYMBOLS.filter(s =>
      ['JNJ', 'UNH', 'PFE', 'ABBV', 'TMO', 'MRK', 'LLY', 'ABT', 'DHR'].includes(s.symbol)
    ),
    '消費財': POPULAR_STOCK_SYMBOLS.filter(s =>
      ['WMT', 'PG', 'KO', 'PEP', 'COST', 'NKE', 'MCD', 'SBUX', 'DIS', 'HD', 'LOW', 'TGT'].includes(s.symbol)
    ),
    'エネルギー': POPULAR_STOCK_SYMBOLS.filter(s =>
      ['XOM', 'CVX', 'COP', 'SLB'].includes(s.symbol)
    ),
    '通信': POPULAR_STOCK_SYMBOLS.filter(s =>
      ['T', 'VZ', 'TMUS'].includes(s.symbol)
    ),
    '工業': POPULAR_STOCK_SYMBOLS.filter(s =>
      ['BA', 'CAT', 'GE', 'MMM', 'HON', 'UPS', 'LMT'].includes(s.symbol)
    ),
    'ETF': POPULAR_STOCK_SYMBOLS.filter(s =>
      ['SPY', 'QQQ', 'DIA', 'IWM', 'VTI'].includes(s.symbol)
    ),
  };
}
