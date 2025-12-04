import { promises as fs } from 'fs';
import path from 'path';

export interface StockSymbol {
  symbol: string;
  name: string;
  exchange: string;
  assetType: string;
  ipoDate: string;
  delistingDate: string | null;
  status: string;
}

interface CacheData {
  symbols: StockSymbol[];
  lastUpdated: number;
}

const CACHE_FILE = path.join(process.cwd(), '.cache', 'stock-symbols.json');
const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24時間

// キャッシュディレクトリを作成
async function ensureCacheDirectory() {
  const cacheDir = path.dirname(CACHE_FILE);
  try {
    await fs.access(cacheDir);
  } catch {
    await fs.mkdir(cacheDir, { recursive: true });
  }
}

// キャッシュを読み込む
export async function readCache(): Promise<CacheData | null> {
  try {
    const data = await fs.readFile(CACHE_FILE, 'utf-8');
    return JSON.parse(data);
  } catch (error) {
    return null;
  }
}

// キャッシュに書き込む
export async function writeCache(symbols: StockSymbol[]): Promise<void> {
  await ensureCacheDirectory();
  const cacheData: CacheData = {
    symbols,
    lastUpdated: Date.now()
  };
  await fs.writeFile(CACHE_FILE, JSON.stringify(cacheData, null, 2), 'utf-8');
}

// キャッシュが有効かチェック
export function isCacheValid(cache: CacheData | null): boolean {
  if (!cache) return false;
  const now = Date.now();
  return (now - cache.lastUpdated) < CACHE_DURATION;
}

// キャッシュを取得または更新
export async function getCachedSymbols(fetchFn: () => Promise<StockSymbol[]>): Promise<StockSymbol[]> {
  const cache = await readCache();

  // キャッシュが有効な場合はそれを返す
  if (isCacheValid(cache)) {
    console.log('[SymbolsCache] Using cached symbols');
    return cache!.symbols;
  }

  // キャッシュが無効な場合は新しいデータを取得
  console.log('[SymbolsCache] Fetching fresh symbols from API');
  const symbols = await fetchFn();
  await writeCache(symbols);
  return symbols;
}

// Alpha VantageのLISTING_STATUSからシンボルを取得
export async function fetchSymbolsFromAlphaVantage(apiKey: string): Promise<StockSymbol[]> {
  const url = `https://www.alphavantage.co/query?function=LISTING_STATUS&apikey=${apiKey}`;

  const response = await fetch(url);
  const csvText = await response.text();

  // CSVをパース
  const lines = csvText.split('\n');
  const headers = lines[0].split(',');

  const symbols: StockSymbol[] = [];

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    const values = line.split(',');
    if (values.length < 6) continue;

    const symbol: StockSymbol = {
      symbol: values[0],
      name: values[1],
      exchange: values[2],
      assetType: values[3],
      ipoDate: values[4],
      delistingDate: values[5] === 'null' ? null : values[5],
      status: values[6] || 'Active'
    };

    // 米国の主要取引所のみをフィルタ（NASDAQ、NYSE、AMEX）
    // アクティブな株式のみ
    if (
      (symbol.exchange === 'NASDAQ' || symbol.exchange === 'NYSE' || symbol.exchange === 'AMEX') &&
      symbol.assetType === 'Stock' &&
      symbol.status === 'Active' &&
      !symbol.delistingDate
    ) {
      symbols.push(symbol);
    }
  }

  console.log(`[SymbolsCache] Fetched ${symbols.length} US stock symbols`);
  return symbols;
}
