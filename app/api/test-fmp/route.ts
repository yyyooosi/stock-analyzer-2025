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

  // Test multiple endpoints to find which ones are working (not Legacy)
  // Many endpoints became "Legacy" after August 31, 2025
  const endpointsToTest = [
    { name: 'Financial Statement Symbol Lists', url: `https://financialmodelingprep.com/api/v3/financial-statement-symbol-lists?apikey=${apiKey}` },
    { name: 'S&P 500 Constituents', url: `https://financialmodelingprep.com/api/v3/sp500_constituent?apikey=${apiKey}` },
    { name: 'NASDAQ Constituents', url: `https://financialmodelingprep.com/api/v3/nasdaq_constituent?apikey=${apiKey}` },
    { name: 'Stock Quote (AAPL,MSFT)', url: `https://financialmodelingprep.com/api/v3/quote/AAPL,MSFT?apikey=${apiKey}` },
  ];

  const testResults = [];

  for (const endpoint of endpointsToTest) {
    try {
      console.log(`[FMP Test] Testing ${endpoint.name}:`, endpoint.url.replace(apiKey, 'REDACTED'));

      const response = await fetch(endpoint.url, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
        },
      });

      const data = await response.json();

      if (response.ok && Array.isArray(data)) {
        testResults.push({
          endpoint: endpoint.name,
          status: 'success',
          stockCount: data.length,
          sample: data.slice(0, 2),
        });
      } else {
        testResults.push({
          endpoint: endpoint.name,
          status: 'failed',
          statusCode: response.status,
          error: data.error || data['Error Message'] || 'Unknown error',
        });
      }
    } catch (error) {
      testResults.push({
        endpoint: endpoint.name,
        status: 'error',
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  // Find the first working endpoint
  const workingEndpoint = testResults.find(r => r.status === 'success');

  if (workingEndpoint) {
    return NextResponse.json({
      ...result,
      message: `✅ FMP API is working! Found working endpoint: ${workingEndpoint.endpoint}`,
      workingEndpoint: workingEndpoint.endpoint,
      stockCount: workingEndpoint.stockCount,
      sampleStocks: workingEndpoint.sample,
      allTestResults: testResults,
      recommendation: `Use ${workingEndpoint.endpoint} endpoint to fetch stock data`,
    });
  }

  // If no endpoint works, return details about all failures
  return NextResponse.json({
    ...result,
    message: '❌ All tested endpoints failed (likely all are Legacy)',
    allTestResults: testResults,
    hint: 'All tested endpoints are Legacy. You may need to upgrade to a paid plan or find alternative endpoints.',
  });
}
