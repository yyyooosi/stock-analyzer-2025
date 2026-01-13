/**
 * Unit tests for FMP API Utility Functions
 */

import {
  fetchFMPSymbolsList,
  fetchFMPStockQuotes,
  fetchFMPComprehensiveStockData,
  FMPQuote,
} from '@/app/utils/fmpApi';

// Mock global fetch
global.fetch = jest.fn();

describe('FMP API Utilities', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.FMP_API_KEY = 'test_api_key_12345';
  });

  afterEach(() => {
    delete process.env.FMP_API_KEY;
  });

  describe('fetchFMPSymbolsList', () => {
    it('should return empty array when API key is not configured', async () => {
      delete process.env.FMP_API_KEY;

      const result = await fetchFMPSymbolsList();

      expect(result).toEqual([]);
      expect(fetch).not.toHaveBeenCalled();
    });

    it('should fetch symbols list successfully', async () => {
      const mockSymbols = ['AAPL', 'MSFT', 'GOOGL', 'AMZN'];

      (fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => mockSymbols,
      });

      const result = await fetchFMPSymbolsList();

      expect(fetch).toHaveBeenCalledTimes(1);
      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('/financial-statement-symbol-lists')
      );
      expect(result).toEqual(mockSymbols);
    });

    it('should handle API errors', async () => {
      (fetch as jest.Mock).mockResolvedValue({
        ok: false,
        status: 401,
        text: async () => 'Invalid API key',
      });

      await expect(fetchFMPSymbolsList()).rejects.toThrow('FMP API returned status 401');
    });

    it('should handle error responses in JSON', async () => {
      (fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({ error: 'Rate limit exceeded' }),
      });

      await expect(fetchFMPSymbolsList()).rejects.toThrow('Rate limit exceeded');
    });

    it('should handle network errors', async () => {
      (fetch as jest.Mock).mockRejectedValue(new Error('Network error'));

      await expect(fetchFMPSymbolsList()).rejects.toThrow('Network error');
    });
  });

  describe('fetchFMPStockQuotes', () => {
    it('should return empty array when API key is not configured', async () => {
      delete process.env.FMP_API_KEY;

      const result = await fetchFMPStockQuotes(['AAPL']);

      expect(result).toEqual([]);
      expect(fetch).not.toHaveBeenCalled();
    });

    it('should fetch quotes for multiple symbols', async () => {
      const mockQuotes: FMPQuote[] = [
        {
          symbol: 'AAPL',
          name: 'Apple Inc.',
          price: 150.0,
          changesPercentage: 1.5,
          change: 2.25,
          dayLow: 148.0,
          dayHigh: 152.0,
          yearHigh: 180.0,
          yearLow: 120.0,
          marketCap: 2500000000000,
          priceAvg50: 145.0,
          priceAvg200: 140.0,
          volume: 75000000,
          avgVolume: 70000000,
          exchange: 'NASDAQ',
          open: 149.0,
          previousClose: 147.75,
          eps: 6.11,
          pe: 24.55,
          sharesOutstanding: 16670000000,
          timestamp: Date.now(),
        },
        {
          symbol: 'MSFT',
          name: 'Microsoft Corporation',
          price: 320.0,
          changesPercentage: 0.8,
          change: 2.5,
          dayLow: 318.0,
          dayHigh: 322.0,
          yearHigh: 350.0,
          yearLow: 250.0,
          marketCap: 2400000000000,
          priceAvg50: 315.0,
          priceAvg200: 300.0,
          volume: 25000000,
          avgVolume: 23000000,
          exchange: 'NASDAQ',
          open: 319.0,
          previousClose: 317.5,
          eps: 10.5,
          pe: 30.48,
          sharesOutstanding: 7500000000,
          timestamp: Date.now(),
        },
      ];

      (fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => mockQuotes,
      });

      const result = await fetchFMPStockQuotes(['AAPL', 'MSFT']);

      expect(fetch).toHaveBeenCalledTimes(1);
      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('/quote/AAPL,MSFT')
      );
      expect(result).toEqual(mockQuotes);
    });

    it('should accept comma-separated string', async () => {
      const mockQuotes: FMPQuote[] = [];

      (fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => mockQuotes,
      });

      await fetchFMPStockQuotes('AAPL,MSFT,GOOGL');

      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('/quote/AAPL,MSFT,GOOGL')
      );
    });

    it('should handle API errors', async () => {
      (fetch as jest.Mock).mockResolvedValue({
        ok: false,
        status: 500,
        text: async () => 'Internal server error',
      });

      await expect(fetchFMPStockQuotes(['AAPL'])).rejects.toThrow(
        'FMP API returned status 500'
      );
    });
  });

  describe('fetchFMPComprehensiveStockData', () => {
    it('should fetch and combine stock data', async () => {
      const mockSymbols = ['AAPL', 'MSFT'];
      const mockQuotes: FMPQuote[] = [
        {
          symbol: 'AAPL',
          name: 'Apple Inc.',
          price: 150.0,
          changesPercentage: 1.5,
          change: 2.25,
          dayLow: 148.0,
          dayHigh: 152.0,
          yearHigh: 180.0,
          yearLow: 120.0,
          marketCap: 2500000000000,
          priceAvg50: 145.0,
          priceAvg200: 140.0,
          volume: 75000000,
          avgVolume: 70000000,
          exchange: 'NASDAQ',
          open: 149.0,
          previousClose: 147.75,
          eps: 6.11,
          pe: 24.55,
          sharesOutstanding: 16670000000,
          timestamp: Date.now(),
        },
      ];

      // Mock symbols list fetch
      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockSymbols,
      });

      // Mock quotes fetch
      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockQuotes,
      });

      const result = await fetchFMPComprehensiveStockData({ limit: 2 });

      expect(result.length).toBeGreaterThan(0);
      expect(result[0]).toHaveProperty('screener');
      expect(result[0].screener.symbol).toBeTruthy();
    });

    it('should apply market cap filters', async () => {
      const mockSymbols = ['AAPL', 'MSFT', 'SMALL'];
      const mockQuotes: FMPQuote[] = [
        {
          symbol: 'AAPL',
          name: 'Apple Inc.',
          price: 150.0,
          changesPercentage: 1.5,
          change: 2.25,
          dayLow: 148.0,
          dayHigh: 152.0,
          yearHigh: 180.0,
          yearLow: 120.0,
          marketCap: 2500000000000, // $2.5T
          priceAvg50: 145.0,
          priceAvg200: 140.0,
          volume: 75000000,
          avgVolume: 70000000,
          exchange: 'NASDAQ',
          open: 149.0,
          previousClose: 147.75,
          eps: 6.11,
          pe: 24.55,
          sharesOutstanding: 16670000000,
          timestamp: Date.now(),
        },
        {
          symbol: 'SMALL',
          name: 'Small Cap Inc.',
          price: 10.0,
          changesPercentage: 0.0,
          change: 0.0,
          dayLow: 9.5,
          dayHigh: 10.5,
          yearHigh: 15.0,
          yearLow: 5.0,
          marketCap: 50000000, // $50M
          priceAvg50: 10.5,
          priceAvg200: 11.0,
          volume: 100000,
          avgVolume: 120000,
          exchange: 'NASDAQ',
          open: 10.0,
          previousClose: 10.0,
          eps: 0.5,
          pe: 20.0,
          sharesOutstanding: 5000000,
          timestamp: Date.now(),
        },
      ];

      // Mock symbols list fetch
      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockSymbols,
      });

      // Mock quotes fetch
      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockQuotes,
      });

      const result = await fetchFMPComprehensiveStockData({
        marketCapMoreThan: 1000000000, // $1B minimum
      });

      // Should only include AAPL (market cap > $1B)
      const symbols = result.map((r) => r.screener.symbol);
      expect(symbols).toContain('AAPL');
      expect(symbols).not.toContain('SMALL');
    });

    it('should return empty array when no symbols found', async () => {
      (fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => [],
      });

      const result = await fetchFMPComprehensiveStockData();

      expect(result).toEqual([]);
    });

    it('should handle rate limiting with delays', async () => {
      const mockSymbols = Array.from({ length: 250 }, (_, i) => `STOCK${i}`);
      const mockQuotes: FMPQuote[] = [];

      // Mock symbols list fetch
      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockSymbols,
      });

      // Mock multiple quote fetches (batched)
      (fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => mockQuotes,
      });

      const startTime = Date.now();
      await fetchFMPComprehensiveStockData({ limit: 250 });
      const endTime = Date.now();

      // Should have delays between batches (at least 500ms per batch)
      // With 250 stocks and batch size 100, we expect 3 batches
      // Delays: 2 * 500ms = 1000ms minimum
      expect(endTime - startTime).toBeGreaterThanOrEqual(1000);
    }, 10000); // Increase timeout for this test
  });
});
