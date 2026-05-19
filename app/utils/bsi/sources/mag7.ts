// Mag7 の S&P500 時価総額シェアを計算する
// FMP の /quote エンドポイントを流用 (既存 fmpApi.ts のパターンに準拠)

const MAG7_SYMBOLS = ['AAPL', 'MSFT', 'GOOGL', 'AMZN', 'NVDA', 'META', 'TSLA'];
// SPY の時価総額を S&P500 全体の近似値として使用
const SP500_PROXY = 'SPY';

const FMP_BASE_URL = 'https://financialmodelingprep.com/api/v3';

interface FmpQuote {
  symbol: string;
  marketCap: number;
  price: number;
  sharesOutstanding: number;
}

async function fetchQuotes(symbols: string[]): Promise<FmpQuote[]> {
  const apiKey = process.env.FMP_API_KEY;
  if (!apiKey) {
    console.warn('[BSI/Mag7] FMP_API_KEY が設定されていません');
    return [];
  }

  const symbolsStr = symbols.join(',');
  try {
    const res = await fetch(
      `${FMP_BASE_URL}/quote/${symbolsStr}?apikey=${apiKey}`
    );
    if (!res.ok) {
      console.error(`[BSI/Mag7] FMP quote エラー: ${res.status}`);
      return [];
    }
    const data = await res.json();
    return Array.isArray(data) ? data : [];
  } catch (err) {
    console.error('[BSI/Mag7] FMP フェッチ例外:', err);
    return [];
  }
}

// Mag7 の S&P500 時価総額シェア (0-1) を計算して返す
// SPY の時価総額 × 10 を S&P500 全体の近似値として使用
// (SPY は S&P500 の約 1/10 規模の ETF ではなく、AUM ≈ 6000億ドル程度)
// より正確には S&P500 全体の時価総額を直接取得するのが理想だが、
// FMP 無料枠では困難なため Mag7 合計 / (Mag7 + SP500指数の時価総額近似) の代わりに
// S&P500 インデックス構成銘柄の時価総額合計を別途取得するのは API コスト大。
// Phase 0 では「Mag7 合計時価総額 / 既知の S&P500 概算時価総額」を固定値で割る簡易版を採用。
// S&P500 全体時価総額 ≈ 45 兆ドル (2024-2025 年の概算値) を基準に使用。
const SP500_APPROX_MARKET_CAP_TRILLION = 45;

export async function calcMag7Share(): Promise<{ share: number; totalMag7Cap: number } | null> {
  const quotes = await fetchQuotes(MAG7_SYMBOLS);
  if (quotes.length === 0) return null;

  const totalMag7Cap = quotes.reduce((sum, q) => sum + (q.marketCap ?? 0), 0);
  if (totalMag7Cap === 0) return null;

  const sp500Cap = SP500_APPROX_MARKET_CAP_TRILLION * 1e12;
  const share = totalMag7Cap / sp500Cap;

  console.log(
    `[BSI/Mag7] 合計時価総額: $${(totalMag7Cap / 1e12).toFixed(2)}T, ` +
      `シェア: ${(share * 100).toFixed(1)}%`
  );

  return { share, totalMag7Cap };
}

// 過去の Mag7 シェアは DB から取得するため、ここでは計算のみ担当
export { MAG7_SYMBOLS };
