/**
 * Unit tests for Screener API
 *
 * To run these tests:
 * 1. Install Jest and testing dependencies:
 *    npm install --save-dev jest @testing-library/react @testing-library/jest-dom jest-environment-jsdom
 * 2. Add test script to package.json:
 *    "test": "jest"
 * 3. Run tests:
 *    npm test
 */

import { GET } from '@/app/api/screener/route';
import { NextRequest } from 'next/server';
import * as fmpApi from '@/app/utils/fmpApi';

// Mock the FMP API module
jest.mock('@/app/utils/fmpApi');

describe('Screener API', () => {
  beforeEach(() => {
    // Reset mocks before each test
    jest.clearAllMocks();

    // Set up environment variable
    process.env.FMP_API_KEY = 'test_api_key_12345';
  });

  afterEach(() => {
    // Clean up
    delete process.env.FMP_API_KEY;
  });

  describe('GET /api/screener', () => {
    it('should return error when FMP_API_KEY is not configured', async () => {
      // Remove API key
      delete process.env.FMP_API_KEY;

      const request = new NextRequest('http://localhost:3000/api/screener');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
      expect(data.error).toContain('FMP APIキーが設定されていません');
    });

    it('should return stocks when FMP API returns data', async () => {
      // Mock successful FMP API response
      const mockFMPData = [
        {
          screener: {
            symbol: 'AAPL',
            companyName: 'Apple Inc.',
            price: 150.0,
            marketCap: 2500000000000,
            sector: 'Technology',
            industry: 'Consumer Electronics',
            beta: 1.2,
            lastAnnualDividend: 0.92,
            volume: 75000000,
            exchange: 'NASDAQ',
            exchangeShortName: 'NASDAQ',
            country: 'US',
            isEtf: false,
            isActivelyTrading: true,
          },
        },
        {
          screener: {
            symbol: 'MSFT',
            companyName: 'Microsoft Corporation',
            price: 320.0,
            marketCap: 2400000000000,
            sector: 'Technology',
            industry: 'Software',
            beta: 1.1,
            lastAnnualDividend: 2.72,
            volume: 25000000,
            exchange: 'NASDAQ',
            exchangeShortName: 'NASDAQ',
            country: 'US',
            isEtf: false,
            isActivelyTrading: true,
          },
        },
      ];

      (fmpApi.fetchFMPComprehensiveStockData as jest.Mock).mockResolvedValue(mockFMPData);

      const request = new NextRequest('http://localhost:3000/api/screener');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.count).toBeGreaterThan(0);
      expect(data.results).toBeInstanceOf(Array);
      expect(data.results[0]).toHaveProperty('symbol');
      expect(data.results[0]).toHaveProperty('score');
    });

    it('should filter stocks by market cap', async () => {
      const mockFMPData = [
        {
          screener: {
            symbol: 'AAPL',
            companyName: 'Apple Inc.',
            price: 150.0,
            marketCap: 2500000000000, // $2.5T
            sector: 'Technology',
            industry: 'Consumer Electronics',
            beta: 1.2,
            lastAnnualDividend: 0.92,
            volume: 75000000,
            exchange: 'NASDAQ',
            exchangeShortName: 'NASDAQ',
            country: 'US',
            isEtf: false,
            isActivelyTrading: true,
          },
        },
        {
          screener: {
            symbol: 'SMALL',
            companyName: 'Small Cap Inc.',
            price: 10.0,
            marketCap: 50000000, // $50M - below minimum
            sector: 'Technology',
            industry: 'Software',
            beta: 1.5,
            lastAnnualDividend: 0,
            volume: 100000,
            exchange: 'NASDAQ',
            exchangeShortName: 'NASDAQ',
            country: 'US',
            isEtf: false,
            isActivelyTrading: true,
          },
        },
      ];

      (fmpApi.fetchFMPComprehensiveStockData as jest.Mock).mockResolvedValue(mockFMPData);

      // Request with minimum market cap filter
      const request = new NextRequest('http://localhost:3000/api/screener?marketCapUSDMin=1000000000');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);

      // Should only include AAPL (market cap > $1B)
      const symbols = data.results.map((r: { symbol: string }) => r.symbol);
      expect(symbols).toContain('AAPL');
      expect(symbols).not.toContain('SMALL');
    });

    it('should filter stocks by sector', async () => {
      const mockFMPData = [
        {
          screener: {
            symbol: 'AAPL',
            companyName: 'Apple Inc.',
            price: 150.0,
            marketCap: 2500000000000,
            sector: 'Technology',
            industry: 'Consumer Electronics',
            beta: 1.2,
            lastAnnualDividend: 0.92,
            volume: 75000000,
            exchange: 'NASDAQ',
            exchangeShortName: 'NASDAQ',
            country: 'US',
            isEtf: false,
            isActivelyTrading: true,
          },
        },
        {
          screener: {
            symbol: 'JPM',
            companyName: 'JPMorgan Chase & Co.',
            price: 140.0,
            marketCap: 400000000000,
            sector: 'Financial Services',
            industry: 'Banks',
            beta: 1.0,
            lastAnnualDividend: 4.0,
            volume: 10000000,
            exchange: 'NYSE',
            exchangeShortName: 'NYSE',
            country: 'US',
            isEtf: false,
            isActivelyTrading: true,
          },
        },
      ];

      (fmpApi.fetchFMPComprehensiveStockData as jest.Mock).mockResolvedValue(mockFMPData);

      // Request with Technology sector filter
      const request = new NextRequest('http://localhost:3000/api/screener?sectors=Technology');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);

      // Should only include Technology stocks
      const symbols = data.results.map((r: { symbol: string }) => r.symbol);
      expect(symbols).toContain('AAPL');
      expect(symbols).not.toContain('JPM');
    });

    it('should return empty results when no stocks match filters', async () => {
      const mockFMPData = [
        {
          screener: {
            symbol: 'SMALL',
            companyName: 'Small Cap Inc.',
            price: 10.0,
            marketCap: 50000000, // $50M
            sector: 'Technology',
            industry: 'Software',
            beta: 1.5,
            lastAnnualDividend: 0,
            volume: 100000,
            exchange: 'NASDAQ',
            exchangeShortName: 'NASDAQ',
            country: 'US',
            isEtf: false,
            isActivelyTrading: true,
          },
        },
      ];

      (fmpApi.fetchFMPComprehensiveStockData as jest.Mock).mockResolvedValue(mockFMPData);

      // Request with very high market cap minimum (nothing will match)
      const request = new NextRequest('http://localhost:3000/api/screener?marketCapUSDMin=5000000000000');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.count).toBe(0);
      expect(data.results).toEqual([]);
    });

    it('should handle FMP API errors gracefully', async () => {
      // Mock FMP API throwing an error
      (fmpApi.fetchFMPComprehensiveStockData as jest.Mock).mockRejectedValue(
        new Error('FMP API connection failed')
      );

      const request = new NextRequest('http://localhost:3000/api/screener');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
      expect(data.error).toBeDefined();
    });

    it('should sort results by score in descending order', async () => {
      const mockFMPData = [
        {
          screener: {
            symbol: 'LOW_SCORE',
            companyName: 'Low Score Inc.',
            price: 50.0,
            marketCap: 500000000000,
            sector: 'Technology',
            industry: 'Software',
            beta: 1.0,
            lastAnnualDividend: 0,
            volume: 1000000,
            exchange: 'NASDAQ',
            exchangeShortName: 'NASDAQ',
            country: 'US',
            isEtf: false,
            isActivelyTrading: true,
          },
        },
        {
          screener: {
            symbol: 'HIGH_SCORE',
            companyName: 'High Score Inc.',
            price: 100.0,
            marketCap: 1000000000000,
            sector: 'Technology',
            industry: 'Software',
            beta: 1.2,
            lastAnnualDividend: 2.0,
            volume: 5000000,
            exchange: 'NASDAQ',
            exchangeShortName: 'NASDAQ',
            country: 'US',
            isEtf: false,
            isActivelyTrading: true,
          },
        },
      ];

      (fmpApi.fetchFMPComprehensiveStockData as jest.Mock).mockResolvedValue(mockFMPData);

      const request = new NextRequest('http://localhost:3000/api/screener');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.results.length).toBeGreaterThan(0);

      // Verify scores are in descending order
      for (let i = 0; i < data.results.length - 1; i++) {
        expect(data.results[i].score.total).toBeGreaterThanOrEqual(
          data.results[i + 1].score.total
        );
      }
    });
  });
});
