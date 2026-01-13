# FMP API Setup Guide

## Overview

This guide explains how to set up and configure the Financial Modeling Prep (FMP) API for the Stock Analyzer application. The FMP API provides comprehensive stock screening and fundamental data.

## Table of Contents

1. [Getting an API Key](#getting-an-api-key)
2. [Configuration](#configuration)
3. [API Endpoints Used](#api-endpoints-used)
4. [Rate Limits](#rate-limits)
5. [Testing the Setup](#testing-the-setup)
6. [Troubleshooting](#troubleshooting)
7. [Alternative Providers](#alternative-providers)

---

## Getting an API Key

### Free Tier (Recommended for Development)

1. **Visit FMP Developer Portal**
   - Go to https://financialmodelingprep.com/developer/docs

2. **Create an Account**
   - Click "Sign Up" or "Get API Key"
   - Provide your email address and create a password
   - Verify your email address

3. **Get Your API Key**
   - After logging in, navigate to your Dashboard
   - Your API key will be displayed prominently
   - Copy this key for configuration

4. **Free Tier Limits**
   - **250 API requests per day**
   - Access to most endpoints
   - Some endpoints marked as "Legacy" (deprecated)
   - Suitable for development and testing

### Paid Plans (For Production)

If you need higher limits or access to all endpoints:

- **Starter Plan** (~$14/month): 500 requests/day
- **Professional Plan** (~$99/month): Unlimited requests
- **Enterprise Plan**: Custom pricing with SLA

Visit https://financialmodelingprep.com/developer/docs/pricing for current pricing.

---

## Configuration

### Local Development

1. **Create Environment File**
   ```bash
   cp .env.example .env.local
   ```

2. **Add Your API Key**

   Open `.env.local` and update the FMP_API_KEY:

   ```bash
   # Financial Modeling Prep API Key
   FMP_API_KEY=your_actual_api_key_here
   ```

3. **Restart Development Server**
   ```bash
   npm run dev
   ```

### Production (Vercel Deployment)

1. **Open Vercel Dashboard**
   - Go to https://vercel.com/dashboard
   - Select your project

2. **Add Environment Variable**
   - Navigate to: Settings → Environment Variables
   - Add new variable:
     - **Name**: `FMP_API_KEY`
     - **Value**: Your FMP API key
     - **Environment**: Production (or All)

3. **Redeploy**
   - Click "Redeploy" or push a new commit to trigger deployment
   - Environment variables will be available on next deployment

### Other Hosting Providers

#### Netlify
1. Site settings → Build & deploy → Environment
2. Add `FMP_API_KEY` variable
3. Redeploy site

#### AWS (Environment Variables)
```bash
aws lambda update-function-configuration \
  --function-name your-function-name \
  --environment Variables={FMP_API_KEY=your_key_here}
```

#### Docker
```dockerfile
# In your Dockerfile or docker-compose.yml
ENV FMP_API_KEY=your_key_here
```

---

## API Endpoints Used

This application uses the following FMP API endpoints:

### 1. Financial Statement Symbol Lists (Primary)
- **Endpoint**: `/api/v3/financial-statement-symbol-lists`
- **Status**: ✅ Active (Not Legacy)
- **Free Tier**: ✅ Available
- **Purpose**: Fetch list of stock symbols with financial statements
- **Usage**: Initial stock symbol discovery

**Example**:
```
GET https://financialmodelingprep.com/api/v3/financial-statement-symbol-lists?apikey=YOUR_KEY
```

### 2. Stock Quote (Primary)
- **Endpoint**: `/api/v3/quote/{symbols}`
- **Status**: ✅ Active (Not Legacy)
- **Free Tier**: ✅ Available
- **Purpose**: Get real-time quotes for multiple stocks
- **Usage**: Fetch price, market cap, volume, P/E ratio
- **Batch Support**: Up to 100 symbols per request (comma-separated)

**Example**:
```
GET https://financialmodelingprep.com/api/v3/quote/AAPL,MSFT,GOOGL?apikey=YOUR_KEY
```

### 3. Key Metrics TTM (Optional)
- **Endpoint**: `/api/v3/key-metrics-ttm/{symbol}`
- **Status**: ✅ Active
- **Free Tier**: ✅ Available
- **Purpose**: Trailing twelve months key financial metrics
- **Usage**: Detailed fundamental analysis (ROE, P/B, etc.)

**Example**:
```
GET https://financialmodelingprep.com/api/v3/key-metrics-ttm/AAPL?apikey=YOUR_KEY
```

### 4. Financial Ratios TTM (Optional)
- **Endpoint**: `/api/v3/ratios-ttm/{symbol}`
- **Status**: ✅ Active
- **Free Tier**: ✅ Available
- **Purpose**: Financial ratios (debt-to-equity, current ratio, etc.)
- **Usage**: Financial health screening

**Example**:
```
GET https://financialmodelingprep.com/api/v3/ratios-ttm/AAPL?apikey=YOUR_KEY
```

### Deprecated Endpoints (Not Used)

⚠️ **Stock Screener** - `/api/v3/stock-screener`
- **Status**: ❌ Legacy (as of August 31, 2025)
- **Replaced by**: Combination of symbol lists + quote endpoints

---

## Rate Limits

### Free Tier Limits

- **Daily Limit**: 250 API requests per day
- **Reset**: 12:00 AM UTC
- **No Rate Limiting**: Within daily quota

### Request Budgeting

For a single screening operation (1,000 stocks):

| Operation | Requests | Notes |
|-----------|----------|-------|
| Fetch Symbols | 1 | Get list of all symbols |
| Fetch Quotes (1000 stocks) | 10 | Batched in groups of 100 |
| **Total** | **11** | Basic screening |

**Optional** (detailed metrics):
| Operation | Requests | Notes |
|-----------|----------|-------|
| Fetch Key Metrics | 1000 | 1 per stock (not recommended for free tier) |
| Fetch Ratios | 1000 | 1 per stock (not recommended for free tier) |

### Best Practices

1. **Cache Results**: Store screening results to avoid repeated API calls
2. **Batch Requests**: Use batch endpoints (quote supports up to 100 symbols)
3. **Selective Fetching**: Only fetch detailed metrics for top-scored stocks
4. **Implement Delays**: Add 500ms delays between batches (implemented in code)

### Monitoring Usage

Track your API usage:

```typescript
// In your application logs
console.log(`[FMP] API call: ${endpoint}`);
console.log(`[FMP] Total calls today: ${callCount}/250`);
```

Or check FMP Dashboard for usage statistics.

---

## Testing the Setup

### 1. Diagnostic Endpoint

Test your API configuration using the built-in diagnostic endpoint:

```bash
# Start development server
npm run dev

# Test diagnostic endpoint
curl http://localhost:3000/api/test-fmp
```

**Expected Response (Success)**:
```json
{
  "timestamp": "2026-01-13T...",
  "apiKeyConfigured": true,
  "apiKeyPreview": "f3FJ...kGdy",
  "message": "✅ FMP API is working! Found working endpoint: Stock Quote",
  "workingEndpoint": "Stock Quote (AAPL,MSFT)",
  "stockCount": 2,
  "sampleStocks": [
    {
      "symbol": "AAPL",
      "name": "Apple Inc.",
      "price": 150.0,
      ...
    }
  ]
}
```

**Expected Response (Failure)**:
```json
{
  "timestamp": "2026-01-13T...",
  "apiKeyConfigured": false,
  "message": "❌ FMP_API_KEY is NOT configured in environment variables",
  "hint": "Set FMP_API_KEY in Vercel → Settings → Environment Variables"
}
```

### 2. Screening Endpoint

Test the actual screening functionality:

```bash
# Basic screening (no filters)
curl http://localhost:3000/api/screener

# With market cap filter
curl "http://localhost:3000/api/screener?marketCapUSDMin=1000000000"

# With sector filter
curl "http://localhost:3000/api/screener?sectors=Technology"
```

**Expected Response**:
```json
{
  "success": true,
  "count": 245,
  "results": [
    {
      "symbol": "AAPL",
      "companyName": "Apple Inc.",
      "price": 150.0,
      "marketCap": 2500000000000,
      "score": {
        "total": 78.5,
        "growth": 25.0,
        "value": 18.0,
        "financialHealth": 19.5,
        "dividend": 6.0,
        "technical": 10.0
      },
      ...
    }
  ]
}
```

### 3. Manual API Test

Test the FMP API directly:

```bash
# Replace YOUR_KEY with your actual API key
curl "https://financialmodelingprep.com/api/v3/quote/AAPL?apikey=YOUR_KEY"
```

---

## Troubleshooting

### Issue 1: "FMP_API_KEY is NOT configured"

**Symptoms**:
- Diagnostic endpoint shows API key not configured
- Screening endpoint returns 500 error

**Solutions**:
1. Verify `.env.local` file exists in project root
2. Check that `FMP_API_KEY=...` line is present (no spaces around `=`)
3. Restart development server after adding/changing `.env.local`
4. For production, verify environment variable in hosting provider dashboard

### Issue 2: "All tested endpoints failed (likely all are Legacy)"

**Symptoms**:
- Diagnostic endpoint reports all endpoints as Legacy
- No stock data returned

**Solutions**:
1. **Check API Key Validity**:
   - Verify API key is correct (copy-paste carefully)
   - Check if key is active (not expired)
   - Test key directly with curl

2. **Network Issues**:
   - Ensure server can access external APIs
   - Check firewall/proxy settings
   - Verify DNS resolution for `financialmodelingprep.com`

3. **Rate Limit Exceeded**:
   - Check if you've exceeded 250 requests/day
   - Wait for daily reset (12:00 AM UTC)
   - Consider upgrading to paid plan

### Issue 3: Empty Results or Low Stock Count

**Symptoms**:
- Screening returns 0 or very few stocks
- Expected stocks missing from results

**Solutions**:
1. **Check Filters**:
   - Verify filter parameters are not too restrictive
   - Try removing filters one by one
   - Test with `?marketCapUSDMin=100000000` (basic filter)

2. **API Data Availability**:
   - Some stocks may not have complete data
   - Try popular large-cap stocks (AAPL, MSFT, GOOGL)

3. **Code Issues**:
   - Check server logs for errors
   - Verify `filterStocksWithSufficientData()` is not too strict

### Issue 4: Slow Performance

**Symptoms**:
- Screening takes too long (>30 seconds)
- Timeout errors

**Solutions**:
1. **Reduce Limit**:
   - Decrease `limit` parameter in screening (default: 1000)
   - Start with `limit=100` for testing

2. **Disable Detailed Fetching**:
   - Set `fetchDetailedData=false` in `fetchFMPComprehensiveStockData()`
   - This skips key metrics and ratios fetching

3. **Optimize Batching**:
   - Adjust batch sizes in code
   - Increase/decrease delays between batches

### Issue 5: "fetch failed" or Network Errors

**Symptoms**:
- All API calls fail with network errors
- Cannot connect to FMP servers

**Solutions**:
1. **Sandbox/Restricted Environment**:
   - Some hosting environments block external API calls
   - Use serverless functions or API routes (already implemented)
   - Contact hosting provider about external API access

2. **HTTPS/SSL Issues**:
   - FMP requires HTTPS
   - Verify SSL certificates are valid

3. **Firewall/Proxy**:
   - Check if corporate firewall blocks FMP domain
   - Add `financialmodelingprep.com` to allowlist

---

## Alternative Providers

If FMP doesn't meet your needs, consider these alternatives:

### 1. Alpha Vantage
- **Website**: https://www.alphavantage.co/
- **Free Tier**: 25 requests/day
- **Pros**: Well-documented, reliable
- **Cons**: Very low free tier limit
- **Already Integrated**: Yes (fallback for stock quotes)

### 2. Yahoo Finance (via yfinance or Yahoo Finance API)
- **Website**: https://finance.yahoo.com/
- **Free Tier**: Unlimited (unofficial APIs)
- **Pros**: Free, comprehensive data
- **Cons**: No official API, may break
- **Already Integrated**: Yes (via yahoo-finance2 package)

### 3. IEX Cloud
- **Website**: https://iexcloud.io/
- **Free Tier**: 50,000 requests/month
- **Pros**: High free tier, good documentation
- **Cons**: Some data requires paid tier

### 4. Polygon.io
- **Website**: https://polygon.io/
- **Free Tier**: Limited
- **Pros**: Real-time data, WebSocket support
- **Cons**: Expensive for retail

### 5. Twelve Data
- **Website**: https://twelvedata.com/
- **Free Tier**: 800 requests/day
- **Pros**: High free tier, good coverage
- **Cons**: Slower response times

---

## API Integration Architecture

### Current Implementation

```
User Request → Next.js API Route (/api/screener)
  ↓
fetchStocksFromFMP()
  ↓
┌─────────────────────────────────────────┐
│ FMP API Utility (app/utils/fmpApi.ts)  │
├─────────────────────────────────────────┤
│ 1. fetchFMPSymbolsList()                │
│    → Get all available symbols          │
│                                         │
│ 2. fetchFMPStockQuotes() (batched)      │
│    → Get quotes for symbols (100 each)  │
│                                         │
│ 3. Optional: Detailed metrics           │
│    → fetchFMPKeyMetrics()               │
│    → fetchFMPFinancialRatios()          │
└─────────────────────────────────────────┘
  ↓
mapFMPDataArrayToStockFundamentals()
  ↓
filterStocksWithSufficientData()
  ↓
matchesFilters() & calculateScore()
  ↓
Sorted Results (by score descending)
  ↓
JSON Response to User
```

### Rate Limiting Strategy

Implemented in `fetchFMPComprehensiveStockData()`:

```typescript
// Batch size for quotes: 100 symbols per request
const quoteBatchSize = 100;

// Process batches with delays
for (let i = 0; i < symbols.length; i += quoteBatchSize) {
  const batch = symbols.slice(i, i + quoteBatchSize);
  const quotes = await fetchFMPStockQuotes(batch);

  // 500ms delay between batches
  if (i + quoteBatchSize < symbols.length) {
    await new Promise(resolve => setTimeout(resolve, 500));
  }
}
```

### Error Handling

```typescript
try {
  const stocks = await fetchStocksFromFMP(filters);
} catch (error) {
  if (error.message.includes('FMP_API_KEY')) {
    return NextResponse.json({
      success: false,
      error: 'FMP APIキーが設定されていません',
      hint: 'https://financialmodelingprep.com/developer/docs でAPIキーを取得してください'
    }, { status: 500 });
  }

  return NextResponse.json({
    success: false,
    error: 'API接続エラー'
  }, { status: 500 });
}
```

---

## Security Best Practices

### 1. Never Expose API Keys

❌ **DON'T**:
```typescript
// Never hardcode API keys in code
const apiKey = 'f3FJh2JitCLnTYOl9iVSVAe6v9SekGdy';
```

✅ **DO**:
```typescript
// Always use environment variables
const apiKey = process.env.FMP_API_KEY;
```

### 2. Use Server-Side API Routes

❌ **DON'T**:
```typescript
// Never call FMP API from client-side code
// Client-side code exposes API key in browser
fetch(`https://financialmodelingprep.com/api/v3/quote/AAPL?apikey=${apiKey}`);
```

✅ **DO**:
```typescript
// Use Next.js API routes (server-side)
// API key stays secure on server
fetch('/api/screener'); // Calls Next.js API route
```

### 3. Add .env Files to .gitignore

```bash
# .gitignore
.env.local
.env*.local
.env.development.local
.env.production.local
```

### 4. Validate API Responses

```typescript
const response = await fetch(url);

if (!response.ok) {
  throw new Error(`API Error: ${response.status}`);
}

const data = await response.json();

// Validate data structure
if (!Array.isArray(data)) {
  throw new Error('Unexpected response format');
}
```

### 5. Implement Request Throttling

```typescript
// Limit requests per user/IP
const requestCounts = new Map();

export async function GET(request: NextRequest) {
  const ip = request.headers.get('x-forwarded-for') || 'unknown';

  const count = requestCounts.get(ip) || 0;
  if (count > 10) {
    return NextResponse.json(
      { error: 'Rate limit exceeded' },
      { status: 429 }
    );
  }

  requestCounts.set(ip, count + 1);

  // ... rest of API logic
}
```

---

## Additional Resources

- **FMP API Documentation**: https://site.financialmodelingprep.com/developer/docs
- **FMP Pricing**: https://financialmodelingprep.com/developer/docs/pricing
- **Support**: support@financialmodelingprep.com
- **Status Page**: https://status.financialmodelingprep.com/
- **Community Forum**: https://financialmodelingprep.com/developer/community

---

## Changelog

### 2026-01-13
- Updated to use `/api/v3/financial-statement-symbol-lists` endpoint
- Deprecated `/api/v3/stock-screener` endpoint (Legacy as of 2025-08-31)
- Added comprehensive error handling
- Implemented rate limiting with batching

### Previous
- Initial FMP API integration
- Basic screening functionality
