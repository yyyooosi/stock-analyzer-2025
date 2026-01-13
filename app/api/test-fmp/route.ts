import { NextResponse } from 'next/server';

/**
 * Diagnostic endpoint to test FMP API configuration and connectivity
 * Access at: /api/test-fmp
 */
export async function GET() {
  const result: {
    timestamp: string;
    apiKeyConfigured: boolean;
    apiKeyPreview?: string;
    testRequest?: {
      success: boolean;
      stockCount?: number;
      error?: string;
      statusCode?: number;
    };
  } = {
    timestamp: new Date().toISOString(),
    apiKeyConfigured: false,
  };

  // Check if API key is configured
  const apiKey = process.env.FMP_API_KEY;

  if (!apiKey) {
    return NextResponse.json({
      ...result,
      message: '❌ FMP_API_KEY is NOT configured in environment variables',
      hint: 'Set FMP_API_KEY in Vercel → Settings → Environment Variables, then Redeploy',
    });
  }

  result.apiKeyConfigured = true;
  result.apiKeyPreview = `${apiKey.substring(0, 4)}...${apiKey.substring(apiKey.length - 4)}`;

  // Test API key with a simple request using the NEW available-traded/list endpoint
  // (stock-screener is deprecated as of August 31, 2025)
  try {
    const testUrl = `https://financialmodelingprep.com/api/v3/available-traded/list?apikey=${apiKey}`;
    console.log('[FMP Test] Testing API with URL:', testUrl.replace(apiKey, 'REDACTED'));

    const response = await fetch(testUrl, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      },
    });

    const statusCode = response.status;

    if (!response.ok) {
      const errorText = await response.text();
      result.testRequest = {
        success: false,
        statusCode,
        error: `HTTP ${statusCode}: ${errorText}`,
      };

      return NextResponse.json({
        ...result,
        message: `❌ FMP API returned error ${statusCode}`,
        hint: statusCode === 403
          ? 'API key may be invalid or expired. Get a new key at https://financialmodelingprep.com/developer/docs'
          : 'Check API key validity and FMP account status',
      });
    }

    const data = await response.json();

    if (Array.isArray(data)) {
      result.testRequest = {
        success: true,
        stockCount: data.length,
      };

      return NextResponse.json({
        ...result,
        message: `✅ FMP API is working! Retrieved ${data.length} tradable stocks`,
        sampleStocks: data.slice(0, 3).map((s: { symbol: string; name: string; price?: number }) => ({
          symbol: s.symbol,
          name: s.name,
          price: s.price,
        })),
        note: 'Using new available-traded/list endpoint (stock-screener deprecated Aug 31, 2025)',
      });
    } else if (data.error || data['Error Message']) {
      result.testRequest = {
        success: false,
        error: data.error || data['Error Message'],
      };

      return NextResponse.json({
        ...result,
        message: '❌ FMP API returned an error',
        hint: 'API key may be invalid. Get a new key at https://financialmodelingprep.com/developer/docs',
      });
    } else {
      result.testRequest = {
        success: false,
        error: 'Unexpected response format',
      };

      return NextResponse.json({
        ...result,
        message: '❌ Unexpected response from FMP API',
        responsePreview: JSON.stringify(data).substring(0, 200),
      });
    }
  } catch (error) {
    result.testRequest = {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };

    return NextResponse.json({
      ...result,
      message: '❌ Failed to connect to FMP API',
      hint: 'Network error or API endpoint unavailable',
    });
  }
}
