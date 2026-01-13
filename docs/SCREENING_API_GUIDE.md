# Stock Screening API Guide

## Overview

The Stock Screening API provides powerful filtering and scoring capabilities for discovering investment opportunities across thousands of US stocks.

## Table of Contents

1. [Quick Start](#quick-start)
2. [API Endpoints](#api-endpoints)
3. [Filter Categories](#filter-categories)
4. [Scoring System](#scoring-system)
5. [Preset Strategies](#preset-strategies)
6. [Examples](#examples)
7. [Response Format](#response-format)

---

## Quick Start

### Basic Screening Request

```bash
# Get all stocks (up to 1000) with default filters
GET /api/screener
```

### With Filters

```bash
# Technology stocks with market cap > $10B
GET /api/screener?sectors=Technology&marketCapUSDMin=10000000000

# High dividend stocks (yield > 3%)
GET /api/screener?dividendYieldMin=3

# Value stocks (P/E < 15, P/B < 2)
GET /api/screener?perMax=15&pbrMax=2
```

---

## API Endpoints

### `/api/screener` (GET)

Main screening endpoint that returns filtered and scored stocks.

**Query Parameters**: See [Filter Categories](#filter-categories)

**Response**: JSON object with results array

**Rate Limit**: Depends on FMP API tier (250 requests/day for free tier)

### `/api/test-fmp` (GET)

Diagnostic endpoint to test FMP API configuration.

**No Parameters Required**

**Response**: API status and sample data

---

## Filter Categories

### 1. Fundamental Filters

#### P/E Ratio (Price-to-Earnings)
- **`perMin`** (number): Minimum P/E ratio
- **`perMax`** (number): Maximum P/E ratio

```bash
# Value stocks with P/E between 10 and 20
?perMin=10&perMax=20
```

#### P/B Ratio (Price-to-Book)
- **`pbrMin`** (number): Minimum P/B ratio
- **`pbrMax`** (number): Maximum P/B ratio

```bash
# Undervalued stocks with P/B < 1.5
?pbrMax=1.5
```

#### PEG Ratio (P/E to Growth)
- **`pegMin`** (number): Minimum PEG ratio
- **`pegMax`** (number): Maximum PEG ratio

```bash
# Growth at reasonable price (PEG < 1)
?pegMax=1
```

#### ROE (Return on Equity)
- **`roeMin`** (number): Minimum ROE percentage

```bash
# High ROE stocks (> 15%)
?roeMin=15
```

#### EPS Growth
- **`epsGrowth3YMin`** (number): Minimum 3-year EPS growth percentage
- **`epsGrowth5YMin`** (number): Minimum 5-year EPS growth percentage

```bash
# Strong growth (3Y EPS growth > 20%)
?epsGrowth3YMin=20
```

#### Revenue Growth
- **`revenueGrowthMin`** (number): Minimum revenue growth percentage
- **`revenueGrowthMax`** (number): Maximum revenue growth percentage

```bash
# Steady revenue growth (10-30%)
?revenueGrowthMin=10&revenueGrowthMax=30
```

#### Margins
- **`operatingMarginMin`** (number): Minimum operating margin percentage
- **`grossMarginMin`** (number): Minimum gross margin percentage

```bash
# High-margin businesses (operating margin > 20%)
?operatingMarginMin=20
```

### 2. Valuation Filters

#### Forward P/E
- **`forwardPERMin`** (number): Minimum forward P/E ratio
- **`forwardPERMax`** (number): Maximum forward P/E ratio

```bash
# Reasonably valued growth stocks
?forwardPERMax=25
```

#### EV/EBITDA
- **`evEbitdaMin`** (number): Minimum EV/EBITDA ratio
- **`evEbitdaMax`** (number): Maximum EV/EBITDA ratio

```bash
# Low EV/EBITDA multiples
?evEbitdaMax=10
```

#### R&D Expense Ratio
- **`rdExpenseRatioMin`** (number): Minimum R&D/Revenue percentage
- **`rdExpenseRatioMax`** (number): Maximum R&D/Revenue percentage

```bash
# Innovation-focused companies (R&D > 10%)
?rdExpenseRatioMin=10
```

### 3. Financial Health Filters

#### Equity Ratio
- **`equityRatioMin`** (number): Minimum equity ratio percentage

```bash
# Strong balance sheet (equity ratio > 50%)
?equityRatioMin=50
```

#### Current Ratio
- **`currentRatioMin`** (number): Minimum current ratio

```bash
# Good liquidity (current ratio > 2)
?currentRatioMin=2
```

#### Debt Ratios
- **`debtRatioMax`** (number): Maximum debt ratio percentage
- **`debtToEquityMax`** (number): Maximum debt-to-equity ratio

```bash
# Low debt (debt-to-equity < 0.5)
?debtToEquityMax=0.5
```

#### Cash Flow
- **`operatingCFPositive`** (boolean): Filter for positive operating cash flow
- **`freeCashFlowPositive`** (boolean): Filter for positive free cash flow
- **`freeCashFlow3YPositive`** (boolean): Filter for 3-year positive FCF

```bash
# Strong cash generators
?operatingCFPositive=true&freeCashFlowPositive=true
```

### 4. Dividend Filters

#### Dividend Yield
- **`dividendYieldMin`** (number): Minimum dividend yield percentage
- **`dividendYieldMax`** (number): Maximum dividend yield percentage

```bash
# High dividend stocks (3-6% yield)
?dividendYieldMin=3&dividendYieldMax=6
```

#### Dividend Consistency
- **`consecutiveDividendYearsMin`** (number): Minimum years of consecutive dividend payments

```bash
# Dividend aristocrats (25+ years)
?consecutiveDividendYearsMin=25
```

#### Payout Ratio
- **`payoutRatioMin`** (number): Minimum payout ratio percentage
- **`payoutRatioMax`** (number): Maximum payout ratio percentage

```bash
# Sustainable dividends (30-60% payout)
?payoutRatioMin=30&payoutRatioMax=60
```

### 5. Technical Filters

#### Moving Averages
- **`aboveSMA50`** (boolean): Price above 50-day moving average
- **`aboveSMA200`** (boolean): Price above 200-day moving average
- **`goldenCross`** (boolean): 50-day MA crossed above 200-day MA

```bash
# Uptrend confirmation
?aboveSMA50=true&aboveSMA200=true
```

#### RSI (Relative Strength Index)
- **`rsiMin`** (number): Minimum RSI (0-100)
- **`rsiMax`** (number): Maximum RSI (0-100)

```bash
# Oversold stocks (RSI < 30)
?rsiMax=30
```

#### MACD
- **`macdBullish`** (boolean): MACD signal is bullish

```bash
# Bullish momentum
?macdBullish=true
```

#### Volume
- **`volumeIncreasePercent`** (number): Minimum volume increase percentage

```bash
# Increased trading activity (volume +50%)
?volumeIncreasePercent=50
```

#### Price Distance from 52-Week High
- **`week52HighDistanceMax`** (number): Maximum distance from 52-week high (percentage)

```bash
# Near 52-week high (within 10%)
?week52HighDistanceMax=10
```

### 6. Market Cap & Sector Filters

#### Market Capitalization
- **`marketCapMin`** (number): Minimum market cap (in local currency)
- **`marketCapMax`** (number): Maximum market cap (in local currency)
- **`marketCapUSDMin`** (number): Minimum market cap in USD
- **`marketCapUSDMax`** (number): Maximum market cap in USD

```bash
# Large-cap stocks (> $10B USD)
?marketCapUSDMin=10000000000

# Mid-cap stocks ($2B - $10B)
?marketCapUSDMin=2000000000&marketCapUSDMax=10000000000

# Small-cap stocks ($300M - $2B)
?marketCapUSDMin=300000000&marketCapUSDMax=2000000000
```

#### Sectors
- **`sectors`** (comma-separated string): Filter by sectors

**Available Sectors**:
- Technology
- Healthcare
- Financial Services
- Consumer Cyclical
- Industrials
- Communication Services
- Consumer Defensive
- Energy
- Utilities
- Real Estate
- Basic Materials

```bash
# Technology and Healthcare stocks
?sectors=Technology,Healthcare
```

#### Themes
- **`themes`** (comma-separated string): Filter by investment themes

**Available Themes**:
- AI (Artificial Intelligence)
- Cloud Computing
- Cybersecurity
- E-commerce
- Renewable Energy
- Biotechnology
- Semiconductors
- Electric Vehicles
- 5G
- Fintech

```bash
# AI and Semiconductor stocks
?themes=AI,Semiconductors
```

### 7. Sentiment Filters

#### Twitter/X Mentions
- **`twitterMentionTrendPositive`** (boolean): Positive mention trend
- **`twitterSentimentFilter`** (string): Filter by sentiment
  - `positive`: Positive sentiment only
  - `neutral`: Neutral sentiment
  - `negative`: Negative sentiment
  - `any`: No sentiment filter (default)

```bash
# Stocks with positive social sentiment
?twitterMentionTrendPositive=true&twitterSentimentFilter=positive
```

#### Negative Keywords
- **`excludeNegativeKeywords`** (boolean): Exclude stocks with negative keywords in news/filings

```bash
# Avoid troubled companies
?excludeNegativeKeywords=true
```

---

## Scoring System

Each stock receives a **total score (0-100)** based on five categories:

### Score Breakdown

| Category | Weight | Max Points | Criteria |
|----------|--------|------------|----------|
| **Growth** | 30% | 30 | EPS growth, revenue growth, ROE |
| **Value** | 25% | 25 | P/E, P/B, PEG, operating margin |
| **Financial Health** | 20% | 20 | Equity ratio, current ratio, debt ratios, cash flow |
| **Dividend** | 10% | 10 | Dividend yield, consecutive years, payout ratio |
| **Technical** | 15% | 15 | Moving averages, RSI, MACD |

### Growth Score (30 points)

- **EPS Growth (3Y)**: 0-10 points
  - 10 points: > 30% growth
  - 5 points: 15-30% growth
  - 2 points: 5-15% growth

- **Revenue Growth**: 0-10 points
  - 10 points: > 20% growth
  - 5 points: 10-20% growth
  - 2 points: 5-10% growth

- **ROE**: 0-10 points
  - 10 points: > 20%
  - 5 points: 15-20%
  - 2 points: 10-15%

### Value Score (25 points)

- **P/E Ratio**: 0-8 points
  - 8 points: < 15
  - 5 points: 15-20
  - 2 points: 20-30

- **P/B Ratio**: 0-7 points
  - 7 points: < 1.5
  - 4 points: 1.5-3
  - 2 points: 3-5

- **PEG Ratio**: 0-5 points
  - 5 points: < 1
  - 3 points: 1-1.5
  - 1 point: 1.5-2

- **Operating Margin**: 0-5 points
  - 5 points: > 20%
  - 3 points: 10-20%
  - 1 point: 5-10%

### Financial Health Score (20 points)

- **Equity Ratio**: 0-5 points
- **Current Ratio**: 0-5 points
- **Debt Ratio**: 0-5 points
- **Operating Cash Flow**: 0-5 points

### Dividend Score (10 points)

- **Dividend Yield**: 0-5 points
- **Consecutive Years**: 0-3 points
- **Payout Ratio**: 0-2 points

### Technical Score (15 points)

- **Moving Averages**: 0-6 points
- **RSI**: 0-4 points
- **MACD**: 0-5 points

---

## Preset Strategies

Use these preset filters for common investment strategies:

### 1. Growth Strategy (`?preset=growth`)

**Focus**: High-growth companies with strong fundamentals

**Filters**:
- EPS Growth (3Y) > 20%
- Revenue Growth > 15%
- ROE > 15%
- Operating Margin > 10%

**Best For**: Long-term capital appreciation

### 2. Value Strategy (`?preset=value`)

**Focus**: Undervalued stocks with strong fundamentals

**Filters**:
- P/E < 15
- P/B < 2
- PEG < 1
- Debt-to-Equity < 0.5

**Best For**: Value investors seeking bargains

### 3. Dividend Strategy (`?preset=dividend`)

**Focus**: High-yield dividend stocks

**Filters**:
- Dividend Yield > 3%
- Consecutive Dividend Years > 10
- Payout Ratio: 30-70%
- Positive Free Cash Flow

**Best For**: Income-focused investors

### 4. Quality Strategy (`?preset=quality`)

**Focus**: Financially strong, stable companies

**Filters**:
- Equity Ratio > 50%
- Current Ratio > 2
- Debt-to-Equity < 0.3
- Operating CF > 0
- ROE > 15%

**Best For**: Conservative investors

### 5. Growth Pro Strategy (`?preset=growthPro`)

**Focus**: Professional-grade growth stock screening

**Filters**:
- All Growth filters +
- Positive Twitter sentiment
- Market Cap > $1B
- Above SMA50 and SMA200

**Best For**: Active growth investors

### 6. Value Recovery Strategy (`?preset=valueRecovery`)

**Focus**: Undervalued stocks showing signs of recovery

**Filters**:
- Low P/E and P/B
- Recent positive price momentum
- Improving margins

**Best For**: Contrarian investors

### 7. Theme Growth Strategy (`?preset=themeGrowth`)

**Focus**: High-growth theme stocks (AI, Cloud, etc.)

**Filters**:
- Themes: AI, Cloud, Cybersecurity, Semiconductors
- High revenue growth
- Strong R&D investment

**Best For**: Tech-focused investors

### 8. Dividend Defensive Strategy (`?preset=dividendDefensive`)

**Focus**: Defensive dividend stocks for market downturns

**Filters**:
- High dividend yield
- Defensive sectors (Utilities, Consumer Defensive)
- Low beta
- Strong financial health

**Best For**: Risk-averse income investors

### 9. Quality Filter Strategy (`?preset=qualityFilter`)

**Focus**: Exclude troubled companies

**Filters**:
- Exclude negative keywords
- Positive operating cash flow
- Debt-to-Equity < 1

**Best For**: Risk management

---

## Examples

### Example 1: Technology Growth Stocks

```bash
GET /api/screener?sectors=Technology&epsGrowth3YMin=25&roeMin=20&marketCapUSDMin=5000000000
```

**Response**:
```json
{
  "success": true,
  "count": 15,
  "results": [
    {
      "symbol": "NVDA",
      "companyName": "NVIDIA Corporation",
      "price": 450.0,
      "marketCap": 1100000000000,
      "sector": "Technology",
      "score": {
        "total": 85.5,
        "growth": 28.0,
        "value": 20.0,
        "financialHealth": 18.0,
        "dividend": 2.5,
        "technical": 17.0
      },
      ...
    }
  ]
}
```

### Example 2: High-Dividend Value Stocks

```bash
GET /api/screener?dividendYieldMin=4&perMax=12&pbrMax=1.5&consecutiveDividendYearsMin=15
```

### Example 3: Small-Cap Growth with Momentum

```bash
GET /api/screener?marketCapUSDMin=300000000&marketCapUSDMax=2000000000&epsGrowth3YMin=30&aboveSMA50=true&volumeIncreasePercent=25
```

### Example 4: Financially Strong Large-Caps

```bash
GET /api/screener?marketCapUSDMin=50000000000&equityRatioMin=60&currentRatioMin=2&debtToEquityMax=0.3&operatingCFPositive=true
```

### Example 5: AI Theme Stocks with Positive Sentiment

```bash
GET /api/screener?themes=AI&twitterMentionTrendPositive=true&twitterSentimentFilter=positive&marketCapUSDMin=1000000000
```

---

## Response Format

### Success Response

```json
{
  "success": true,
  "count": 245,
  "results": [
    {
      // Basic Info
      "symbol": "AAPL",
      "companyName": "Apple Inc.",
      "sector": "Technology",
      "industry": "Consumer Electronics",
      "exchange": "NASDAQ",
      "country": "US",

      // Price & Valuation
      "price": 150.0,
      "marketCap": 2500000000000,
      "marketCapUSD": 2500000000000,
      "per": 24.5,
      "pbr": 35.0,
      "peg": 2.1,
      "forwardPER": 23.0,
      "evEbitda": 18.5,

      // Growth Metrics
      "epsGrowth3Y": 25.0,
      "epsGrowth5Y": 22.0,
      "revenueGrowth": 15.0,
      "roePercent": 120.0,

      // Margins
      "operatingMargin": 30.0,
      "grossMargin": 42.0,
      "rdExpenseRatio": 6.5,

      // Financial Health
      "equityRatio": 35.0,
      "currentRatio": 1.2,
      "debtRatio": 30.0,
      "debtToEquity": 1.5,
      "operatingCF": 110000000000,
      "freeCashFlow": 95000000000,

      // Dividends
      "dividendYield": 0.6,
      "consecutiveDividendYears": 11,
      "payoutRatio": 15.0,

      // Technical Indicators
      "sma50": 145.0,
      "sma200": 140.0,
      "rsi": 65.0,
      "macdSignal": "bullish",
      "volumeChange": 5.0,
      "week52HighDistance": 8.0,

      // Sentiment (if available)
      "twitterMentions": 15000,
      "twitterSentiment": "positive",

      // Score Breakdown
      "score": {
        "total": 78.5,
        "growth": 25.0,
        "value": 18.0,
        "financialHealth": 19.5,
        "dividend": 6.0,
        "technical": 10.0
      }
    },
    // ... more stocks
  ]
}
```

### Error Response

```json
{
  "success": false,
  "error": "FMP APIキーが設定されていません。環境変数FMP_API_KEYを設定してください。",
  "hint": "https://financialmodelingprep.com/developer/docs でAPIキーを取得できます（無料プラン: 250リクエスト/日）"
}
```

### Empty Results

```json
{
  "success": true,
  "count": 0,
  "results": []
}
```

---

## Best Practices

### 1. Start Broad, Then Narrow

```bash
# Start with minimal filters
GET /api/screener?marketCapUSDMin=1000000000

# Add filters incrementally
GET /api/screener?marketCapUSDMin=1000000000&sectors=Technology

# Refine further
GET /api/screener?marketCapUSDMin=1000000000&sectors=Technology&epsGrowth3YMin=20
```

### 2. Use Scoring to Find Best Matches

Results are automatically sorted by total score (descending). Focus on top-scored stocks.

### 3. Combine Multiple Filter Categories

```bash
# Growth + Financial Health + Momentum
?epsGrowth3YMin=20&equityRatioMin=50&aboveSMA50=true
```

### 4. Monitor API Usage

With free tier (250 requests/day):
- Each screening call uses ~11 API requests (for 1000 stocks)
- You can perform ~22 screenings per day
- Cache results to avoid repeated calls

### 5. Validate Results

Always verify screening results with additional research:
- Check company fundamentals
- Review recent news and earnings
- Analyze competitors
- Consider broader market conditions

---

## Integration Examples

### JavaScript/TypeScript

```typescript
async function screenStocks(filters: Record<string, string | number | boolean>) {
  const params = new URLSearchParams();

  Object.entries(filters).forEach(([key, value]) => {
    params.append(key, String(value));
  });

  const response = await fetch(`/api/screener?${params}`);
  const data = await response.json();

  if (!data.success) {
    throw new Error(data.error);
  }

  return data.results;
}

// Usage
const techGrowthStocks = await screenStocks({
  sectors: 'Technology',
  epsGrowth3YMin: 25,
  marketCapUSDMin: 5000000000,
});
```

### Python

```python
import requests

def screen_stocks(filters):
    response = requests.get(
        'http://localhost:3000/api/screener',
        params=filters
    )
    data = response.json()

    if not data['success']:
        raise Exception(data['error'])

    return data['results']

# Usage
dividend_stocks = screen_stocks({
    'dividendYieldMin': 4,
    'consecutiveDividendYearsMin': 15,
    'marketCapUSDMin': 10000000000
})
```

### cURL

```bash
# Save results to file
curl "http://localhost:3000/api/screener?sectors=Technology&epsGrowth3YMin=20" \
  -o tech_growth.json

# Pretty print with jq
curl -s "http://localhost:3000/api/screener?dividendYieldMin=3" | jq '.'
```

---

## Support

For issues or questions:
- Check the [Troubleshooting Guide](./FMP_API_SETUP.md#troubleshooting)
- Review [FMP API Documentation](https://site.financialmodelingprep.com/developer/docs)
- Open an issue on GitHub

---

## Related Documentation

- [FMP API Setup Guide](./FMP_API_SETUP.md)
- [Testing Guide](../__tests__/README.md)
- [API Reference](./API_REFERENCE.md)
