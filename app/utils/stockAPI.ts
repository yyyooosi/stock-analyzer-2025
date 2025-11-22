interface StockData {
  symbol: string;
  price: number;
  change: number;
  changePercent: number;
  timestamp: string;
}

interface ChartData {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

interface AlphaVantageResponse {
  'Global Quote': {
    '01. symbol': string;
    '02. open': string;
    '03. high': string;
    '04. low': string;
    '05. price': string;
    '06. volume': string;
    '07. latest trading day': string;
    '08. previous close': string;
    '09. change': string;
    '10. change percent': string;
  };
}

interface AlphaVantageTimeSeriesResponse {
  'Meta Data': {
    '1. Information': string;
    '2. Symbol': string;
    '3. Last Refreshed': string;
    '4. Output Size': string;
    '5. Time Zone': string;
  };
  'Time Series (Daily)': {
    [date: string]: {
      '1. open': string;
      '2. high': string;
      '3. low': string;
      '4. close': string;
      '5. volume': string;
    };
  };
}

// バックエンドAPIのベースURL
const BACKEND_API_BASE = '/api/stock';

// APIレート制限管理
class RateLimiter {
  private requests: number[] = [];
  private readonly maxRequests = 5; // 1分間に5回まで
  private readonly timeWindow = 60000; // 1分 = 60秒

  canMakeRequest(): boolean {
    const now = Date.now();
    // 1分以上古いリクエストを削除
    this.requests = this.requests.filter(time => now - time < this.timeWindow);
    return this.requests.length < this.maxRequests;
  }

  recordRequest(): void {
    this.requests.push(Date.now());
  }

  getWaitTime(): number {
    if (this.requests.length === 0) return 0;
    const oldestRequest = Math.min(...this.requests);
    const waitTime = this.timeWindow - (Date.now() - oldestRequest);
    return Math.max(0, waitTime);
  }
}

const rateLimiter = new RateLimiter();

// APIエラーの処理
export class StockAPIError extends Error {
  constructor(message: string, public code?: string) {
    super(message);
    this.name = 'StockAPIError';
  }
}

// 実際の株価データを取得（バックエンド経由）
export async function fetchRealStockData(symbol: string): Promise<StockData> {
  // レート制限チェック
  if (!rateLimiter.canMakeRequest()) {
    const waitTime = rateLimiter.getWaitTime();
    throw new StockAPIError(`APIレート制限に達しました。${Math.ceil(waitTime / 1000)}秒後に再試行してください。`);
  }

  try {
    rateLimiter.recordRequest();

    const response = await fetch(
      `${BACKEND_API_BASE}/quote?symbol=${encodeURIComponent(symbol)}`
    );

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new StockAPIError(
        errorData.error || `HTTP Error: ${response.status} ${response.statusText}`,
        String(response.status)
      );
    }

    const data: AlphaVantageResponse = await response.json();

    // APIエラーチェック
    if (!data['Global Quote'] || Object.keys(data['Global Quote']).length === 0) {
      throw new StockAPIError(`シンボル "${symbol}" のデータが見つかりません。正しいシンボルを入力してください。`);
    }

    const quote = data['Global Quote'];

    // データの解析と変換
    const price = parseFloat(quote['05. price']);
    const change = parseFloat(quote['09. change']);
    const changePercentStr = quote['10. change percent'].replace('%', '');
    const changePercent = parseFloat(changePercentStr);

    return {
      symbol: quote['01. symbol'],
      price,
      change,
      changePercent,
      timestamp: new Date().toISOString()
    };

  } catch (error) {
    if (error instanceof StockAPIError) {
      throw error;
    }
    throw new StockAPIError(`データ取得エラー: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

// 履歴データ（チャート用）を取得（バックエンド経由）
export async function fetchRealChartData(symbol: string): Promise<ChartData[]> {
  // レート制限チェック
  if (!rateLimiter.canMakeRequest()) {
    const waitTime = rateLimiter.getWaitTime();
    throw new StockAPIError(`APIレート制限に達しました。${Math.ceil(waitTime / 1000)}秒後に再試行してください。`);
  }

  try {
    rateLimiter.recordRequest();

    const response = await fetch(
      `${BACKEND_API_BASE}/timeseries?symbol=${encodeURIComponent(symbol)}`
    );

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new StockAPIError(
        errorData.error || `HTTP Error: ${response.status} ${response.statusText}`,
        String(response.status)
      );
    }

    const data: AlphaVantageTimeSeriesResponse = await response.json();

    // APIエラーチェック
    if (!data['Time Series (Daily)']) {
      throw new StockAPIError(`シンボル "${symbol}" の履歴データが見つかりません。`);
    }

    const timeSeries = data['Time Series (Daily)'];
    const chartData: ChartData[] = [];

    // 最新30日分のデータを取得
    const sortedDates = Object.keys(timeSeries).sort().slice(-30);

    for (const date of sortedDates) {
      const dayData = timeSeries[date];
      chartData.push({
        date,
        open: parseFloat(dayData['1. open']),
        high: parseFloat(dayData['2. high']),
        low: parseFloat(dayData['3. low']),
        close: parseFloat(dayData['4. close']),
        volume: parseInt(dayData['5. volume'])
      });
    }

    return chartData;

  } catch (error) {
    if (error instanceof StockAPIError) {
      throw error;
    }
    throw new StockAPIError(`履歴データ取得エラー: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

// シード値を使った疑似ランダム生成器
class SeededRandom {
  private seed: number;

  constructor(seed: number) {
    this.seed = seed % 2147483647;
    if (this.seed <= 0) this.seed += 2147483646;
  }

  next(): number {
    this.seed = (this.seed * 16807) % 2147483647;
    return (this.seed - 1) / 2147483646;
  }
}

// 文字列からシード値を生成
function stringToSeed(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // 32bit integerに変換
  }
  return Math.abs(hash);
}

// デモモード用のサンプルデータ生成（銘柄ごとに一貫性のあるデータ）
export function generateSampleData(symbol: string): { stock: StockData; chart: ChartData[] } {
  // 銘柄シンボルからシード値を生成（同じ銘柄なら同じシード）
  const seed = stringToSeed(symbol);
  const rng = new SeededRandom(seed);
  
  // 銘柄ごとに特徴的な基準価格を設定
  const symbolPrices: { [key: string]: number } = {
    'AAPL': 150,
    'MSFT': 300,
    'GOOGL': 2500,
    'AMZN': 3000,
    'TSLA': 200,
    'META': 250,
    'NVDA': 400,
    'NFLX': 400,
    'BABA': 100,
    'DIS': 100
  };
  
  const basePrice = symbolPrices[symbol.toUpperCase()] || (50 + rng.next() * 150);
  
  // 30日間のチャートデータを生成（一貫性のあるデータ）
  const chartDataArray: ChartData[] = [];
  let currentPriceValue = basePrice;
  
  for (let i = 29; i >= 0; i--) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    
    // 銘柄とi値をシードに使用して一貫性のあるランダム値を生成
    const dayRng = new SeededRandom(seed + i);
    
    const volatility = 0.02; // 2%のボラティリティに調整
    const trendFactor = i > 15 ? -0.0005 : 0.001; // より穏やかなトレンド
    const dailyChange = (dayRng.next() - 0.5) * volatility + trendFactor;
    
    const open = currentPriceValue;
    const close = currentPriceValue * (1 + dailyChange);
    const high = Math.max(open, close) * (1 + dayRng.next() * 0.015);
    const low = Math.min(open, close) * (1 - dayRng.next() * 0.015);
    const volume = Math.floor(dayRng.next() * 800000) + 600000;

    chartDataArray.push({
      date: date.toISOString().split('T')[0],
      open,
      high,
      low,
      close,
      volume
    });

    currentPriceValue = close;
  }

  // 今日の価格変動を計算（一貫性のある変動）
  const todayRng = new SeededRandom(seed + 100);
  const todayChange = (todayRng.next() - 0.5) * 0.03; // 3%以内の変動
  
  const finalPrice = currentPriceValue * (1 + todayChange);
  const yesterdayPrice = chartDataArray[chartDataArray.length - 1].close;
  const change = finalPrice - yesterdayPrice;
  const changePercent = (change / yesterdayPrice) * 100;

  const stock: StockData = {
    symbol: symbol.toUpperCase(),
    price: finalPrice,
    change,
    changePercent,
    timestamp: new Date().toISOString()
  };

  return { stock, chart: chartDataArray };
}

// 統合データ取得関数（実データ → フォールバック → サンプルデータ）
export async function fetchStockData(symbol: string, useRealData: boolean = true): Promise<{ stock: StockData; chart: ChartData[] }> {
  if (!useRealData) {
    console.log('デモモードでサンプルデータを使用中...');
    return generateSampleData(symbol);
  }

  try {
    console.log(`実データを取得中: ${symbol}`);

    // 並行して株価データと履歴データを取得
    const [stockData, chartData] = await Promise.all([
      fetchRealStockData(symbol),
      fetchRealChartData(symbol)
    ]);

    console.log('実データの取得が完了しました');
    return { stock: stockData, chart: chartData };

  } catch (error) {
    console.warn('実データの取得に失敗、サンプルデータを使用:', error instanceof Error ? error.message : error);

    // エラーが発生した場合はサンプルデータにフォールバック
    return generateSampleData(symbol);
  }
}