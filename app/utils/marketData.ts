/**
 * 市場データとバリュエーション指標の取得
 * Yahoo Finance、FRED、その他の公開データソースを使用
 */

import yahooFinance from 'yahoo-finance2';

/**
 * S&P 500の現在データを取得
 */
export async function fetchSP500Data() {
  try {
    const quote = await yahooFinance.quote('^GSPC') as {
      regularMarketPrice?: number;
      regularMarketChange?: number;
      regularMarketChangePercent?: number;
      marketCap?: number;
      trailingPE?: number;
    };

    return {
      price: quote.regularMarketPrice || 0,
      change: quote.regularMarketChange || 0,
      changePercent: quote.regularMarketChangePercent || 0,
      marketCap: quote.marketCap,
      pe: quote.trailingPE,
    };
  } catch (error) {
    console.error('Error fetching S&P 500 data:', error);
    return null;
  }
}

/**
 * VIX（恐怖指数）を取得
 */
export async function fetchVIX() {
  try {
    const quote = await yahooFinance.quote('^VIX') as {
      regularMarketPrice?: number;
    };
    return quote.regularMarketPrice || null;
  } catch (error) {
    console.error('Error fetching VIX:', error);
    return null;
  }
}

/**
 * CAPE（Shiller PER）の概算値を取得
 * 注: 正確なCAPEはRobert Shillerのデータセットから取得する必要があります
 * ここでは通常のPERを基準に概算値を計算
 */
export async function fetchCAPE() {
  try {
    const sp500 = await fetchSP500Data();
    if (!sp500 || !sp500.pe) return null;

    // 簡易的な概算: 通常のPERは短期、CAPEは10年平均
    // CAPEは通常PERより低めになる傾向があるため、0.85-0.95の係数を使用
    const estimatedCAPE = sp500.pe * 0.9;

    return estimatedCAPE;
  } catch (error) {
    console.error('Error calculating CAPE:', error);
    return null;
  }
}

/**
 * バフェット指標（Wilshire 5000 / GDP）を取得
 */
export async function fetchBuffettIndicator(fredApiKey?: string) {
  if (!fredApiKey) return null;

  try {
    // Wilshire 5000 Total Market Index
    const wilshireUrl = `https://api.stlouisfed.org/fred/series/observations?series_id=WILL5000INDFC&api_key=${fredApiKey}&file_type=json&sort_order=desc&limit=1`;

    // GDP
    const gdpUrl = `https://api.stlouisfed.org/fred/series/observations?series_id=GDP&api_key=${fredApiKey}&file_type=json&sort_order=desc&limit=1`;

    const [wilshireRes, gdpRes] = await Promise.all([
      fetch(wilshireUrl, { cache: 'no-store' }),
      fetch(gdpUrl, { cache: 'no-store' }),
    ]);

    if (!wilshireRes.ok || !gdpRes.ok) return null;

    const wilshireData = await wilshireRes.json();
    const gdpData = await gdpRes.json();

    if (
      wilshireData.observations?.[0]?.value &&
      gdpData.observations?.[0]?.value
    ) {
      const wilshire = parseFloat(wilshireData.observations[0].value);
      const gdp = parseFloat(gdpData.observations[0].value);

      // Wilshireは指数、GDPは10億ドル単位
      // バフェット指標 = (Wilshire × 1.2) / GDP × 100
      // 1.2は時価総額への変換係数（概算）
      const buffettIndicator = (wilshire * 1.2 / gdp) * 100;

      return buffettIndicator;
    }

    return null;
  } catch (error) {
    console.error('Error fetching Buffett Indicator:', error);
    return null;
  }
}

/**
 * PSR（Price to Sales Ratio）の概算
 */
export async function fetchPSR() {
  try {
    const sp500 = await fetchSP500Data();
    if (!sp500 || !sp500.pe) return null;

    // PSR = PER / 利益率
    // S&P500の平均利益率を10-12%と仮定
    const estimatedPSR = sp500.pe * 0.1;

    return estimatedPSR;
  } catch (error) {
    console.error('Error calculating PSR:', error);
    return null;
  }
}

/**
 * 株益利回りスプレッド（Earnings Yield - 10Y Treasury）
 */
export async function fetchEarningsYieldSpread(
  yield10Y: number | null
): Promise<number | null> {
  try {
    const sp500 = await fetchSP500Data();
    if (!sp500 || !sp500.pe || !yield10Y) return null;

    // 株益利回り = 1 / PER
    const earningsYield = (1 / sp500.pe) * 100;

    // スプレッド = 株益利回り - 10年債利回り
    const spread = earningsYield - yield10Y;

    return spread;
  } catch (error) {
    console.error('Error calculating earnings yield spread:', error);
    return null;
  }
}

/**
 * 騰落銘柄比率を取得（簡易版）
 */
export async function fetchAdvanceDeclineRatio() {
  try {
    // NYSE Advance-Decline Lineの代わりに、主要指数のパフォーマンスから推定
    // より正確なデータはMarket Internalsから取得する必要があります

    // ここでは簡易的にランダムな値を返します（実際のAPIと統合時に置き換え）
    // 実装時は https://www.nyse.com/market-data などのソースを使用
    return null;
  } catch (error) {
    console.error('Error fetching advance-decline ratio:', error);
    return null;
  }
}

/**
 * 指数集中度（トップ10銘柄の時価総額シェア）を計算
 */
export async function fetchIndexConcentration() {
  try {
    // S&P500のトップ10銘柄を取得して集中度を計算
    // 簡易的には、Magnificent 7（AAPL, MSFT, GOOGL, AMZN, NVDA, META, TSLA）
    // のシェアで代用
    const symbols = ['AAPL', 'MSFT', 'GOOGL', 'AMZN', 'NVDA', 'META', 'TSLA', 'BRK-B', 'UNH', 'JNJ'];

    const quotes = await Promise.all(
      symbols.map(async (symbol) => {
        try {
          const quote = await yahooFinance.quote(symbol) as { marketCap?: number };
          return quote.marketCap || 0;
        } catch {
          return 0;
        }
      })
    );

    const top10MarketCap = quotes.reduce((sum, cap) => sum + cap, 0);

    // S&P500の総時価総額を取得
    const sp500 = await fetchSP500Data();
    if (!sp500 || !sp500.marketCap) {
      // 概算: トップ10が約40兆ドル、S&P500全体が約45兆ドルと仮定
      const estimatedShare = (top10MarketCap / 45000000000000) * 100;
      return estimatedShare;
    }

    const concentration = (top10MarketCap / sp500.marketCap) * 100;
    return concentration;
  } catch (error) {
    console.error('Error calculating index concentration:', error);
    return null;
  }
}

/**
 * レバレッジETF残高を取得
 */
export async function fetchLeveragedETFAssets() {
  try {
    // 主要なレバレッジETFの運用資産を合計
    // TQQQ, SQQQ, SPXL, SPXS など
    const leveragedETFs = ['TQQQ', 'SQQQ', 'SPXL', 'SPXS', 'UPRO', 'SPXU'];

    const assets = await Promise.all(
      leveragedETFs.map(async (symbol) => {
        try {
          const quote = await yahooFinance.quote(symbol) as {
            regularMarketPrice?: number;
            averageVolume?: number;
          };
          // totalAssetsは一部のETFでのみ利用可能
          // 価格 × 出来高で概算
          const estimatedAssets = (quote.regularMarketPrice || 0) * (quote.averageVolume || 0) * 30;
          return estimatedAssets;
        } catch {
          return 0;
        }
      })
    );

    const totalAssets = assets.reduce((sum, asset) => sum + asset, 0);

    // 10億ドル単位に変換
    return totalAssets / 1000000000;
  } catch (error) {
    console.error('Error fetching leveraged ETF assets:', error);
    return null;
  }
}

/**
 * Put/Call比率を取得
 */
export async function fetchPutCallRatio() {
  try {
    // CBOE Put/Call Ratioはリアルタイムデータが必要
    // ここでは概算値を返します（実際のAPIと統合時に置き換え）
    return null;
  } catch (error) {
    console.error('Error fetching put/call ratio:', error);
    return null;
  }
}

/**
 * 信用取引残高を取得（FINRA Margin Debt）
 */
export async function fetchMarginDebt(fredApiKey?: string) {
  if (!fredApiKey) return null;

  try {
    // FINRA Margin Debt（月次データ）
    const url = `https://api.stlouisfed.org/fred/series/observations?series_id=BOGZ1FL663067003Q&api_key=${fredApiKey}&file_type=json&sort_order=desc&limit=1`;

    const response = await fetch(url, { cache: 'no-store' });

    if (!response.ok) return null;

    const data = await response.json();

    if (data.observations?.[0]?.value) {
      const marginDebt = parseFloat(data.observations[0].value);
      // 百万ドル単位から10億ドル単位に変換
      return marginDebt / 1000;
    }

    return null;
  } catch (error) {
    console.error('Error fetching margin debt:', error);
    return null;
  }
}

/**
 * AAII強気比率を取得
 */
export async function fetchAAIIBullish() {
  try {
    // AAII Sentiment Surveyは有料データ
    // 代替として市場のモメンタムなどから推定する必要があります
    // ここではnullを返します（実際のデータソースと統合時に置き換え）
    return null;
  } catch (error) {
    console.error('Error fetching AAII bullish sentiment:', error);
    return null;
  }
}
