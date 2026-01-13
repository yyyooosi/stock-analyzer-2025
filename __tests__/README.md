# Testing Guide for Stock Analyzer

## Overview

This directory contains automated tests for the Stock Analyzer application, with a focus on the screening API and FMP API integration.

## Test Setup

### 1. Install Test Dependencies

First, install the required testing libraries:

```bash
npm install --save-dev \
  jest \
  @testing-library/react \
  @testing-library/jest-dom \
  @testing-library/user-event \
  jest-environment-jsdom \
  @types/jest
```

### 2. Update package.json

Add the test script to your `package.json`:

```json
{
  "scripts": {
    "test": "jest",
    "test:watch": "jest --watch",
    "test:coverage": "jest --coverage"
  }
}
```

## Running Tests

### Run all tests
```bash
npm test
```

### Run tests in watch mode (for development)
```bash
npm run test:watch
```

### Run tests with coverage report
```bash
npm run test:coverage
```

### Run specific test file
```bash
npm test -- __tests__/api/screener.test.ts
```

### Run tests matching a pattern
```bash
npm test -- --testNamePattern="should filter stocks"
```

## Test Structure

### API Tests

- **`__tests__/api/screener.test.ts`** - Tests for the screening API endpoint
  - API key validation
  - Stock filtering (market cap, sector, etc.)
  - Score calculation and sorting
  - Error handling

### Utility Tests

- **`__tests__/utils/fmpApi.test.ts`** - Tests for FMP API utility functions
  - Symbol list fetching
  - Stock quote fetching
  - Comprehensive data aggregation
  - Rate limiting and batching
  - Error handling

## Test Coverage

The tests cover the following key areas:

1. **Authentication & Configuration**
   - API key presence validation
   - Environment variable handling

2. **Data Fetching**
   - FMP API integration
   - Network error handling
   - Response parsing

3. **Filtering & Screening**
   - Market cap filters
   - Sector filters
   - Price filters
   - Volume filters

4. **Scoring & Ranking**
   - Score calculation
   - Result sorting
   - Multi-criteria evaluation

5. **Error Handling**
   - Missing API key
   - Network failures
   - Invalid responses
   - Empty results

## Coverage Goals

Minimum coverage thresholds are set in `jest.config.js`:

- Branches: 50%
- Functions: 50%
- Lines: 50%
- Statements: 50%

## Writing New Tests

### Test File Naming Convention

- Unit tests: `*.test.ts` or `*.test.tsx`
- Location: `__tests__/` directory, mirroring the app structure

### Example Test Template

```typescript
import { functionToTest } from '@/app/path/to/module';

describe('Feature Name', () => {
  beforeEach(() => {
    // Setup before each test
  });

  afterEach(() => {
    // Cleanup after each test
  });

  it('should do something expected', () => {
    // Arrange
    const input = 'test data';

    // Act
    const result = functionToTest(input);

    // Assert
    expect(result).toBe('expected output');
  });

  it('should handle errors gracefully', () => {
    // Test error cases
    expect(() => functionToTest(null)).toThrow('Expected error message');
  });
});
```

## Mocking

### Mocking External APIs

Tests use Jest mocks to simulate FMP API responses without making real network requests:

```typescript
import * as fmpApi from '@/app/utils/fmpApi';

jest.mock('@/app/utils/fmpApi');

// In your test:
(fmpApi.fetchFMPStockQuotes as jest.Mock).mockResolvedValue([
  { symbol: 'AAPL', price: 150.0, /* ... */ }
]);
```

### Mocking fetch

Global fetch is mocked in the test files:

```typescript
global.fetch = jest.fn();

(fetch as jest.Mock).mockResolvedValue({
  ok: true,
  json: async () => ({ data: 'mock data' }),
});
```

## Continuous Integration

To run tests in CI/CD pipelines:

```yaml
# Example GitHub Actions workflow
- name: Run tests
  run: npm test -- --ci --coverage --maxWorkers=2
```

## Troubleshooting

### Common Issues

1. **"Cannot find module '@/...'**
   - Ensure `jest.config.js` has correct `moduleNameMapper` configuration
   - Check that TypeScript paths in `tsconfig.json` match

2. **"ReferenceError: fetch is not defined"**
   - Make sure `global.fetch` is mocked in your test file
   - Or install `whatwg-fetch` polyfill

3. **Tests timeout**
   - Increase Jest timeout: `jest.setTimeout(10000)`
   - Check for missing async/await

4. **Module import errors**
   - Ensure all dependencies are installed
   - Clear Jest cache: `npm test -- --clearCache`

## Best Practices

1. **Isolation**: Each test should be independent
2. **AAA Pattern**: Arrange, Act, Assert
3. **Descriptive Names**: Use clear test descriptions
4. **Mock External Dependencies**: Don't make real API calls in unit tests
5. **Test Edge Cases**: Include error scenarios and boundary conditions
6. **Keep Tests Fast**: Avoid long-running operations
7. **Clean Up**: Use `beforeEach`/`afterEach` for setup and teardown

## Resources

- [Jest Documentation](https://jestjs.io/docs/getting-started)
- [Testing Library](https://testing-library.com/docs/react-testing-library/intro/)
- [Next.js Testing Guide](https://nextjs.org/docs/testing)
