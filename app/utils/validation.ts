/**
 * Input validation utilities for API endpoints
 *
 * All user inputs should be validated before processing to prevent
 * injection attacks and ensure data integrity.
 */

/**
 * Validate stock symbol format
 * Stock symbols are typically 1-5 uppercase letters, sometimes with a dot or dash
 */
export function isValidStockSymbol(symbol: string): boolean {
  if (!symbol || typeof symbol !== 'string') return false;

  // Allow 1-10 characters: letters, numbers, dots, dashes
  // Examples: AAPL, BRK.A, BRK-B, 7203.T
  const symbolRegex = /^[A-Z0-9][A-Z0-9.-]{0,9}$/i;
  return symbolRegex.test(symbol.trim());
}

/**
 * Sanitize stock symbol - uppercase and trim
 */
export function sanitizeStockSymbol(symbol: string): string {
  return symbol.trim().toUpperCase().slice(0, 10);
}

/**
 * Validate email address format
 */
export function isValidEmail(email: string): boolean {
  if (!email || typeof email !== 'string') return false;

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email) && email.length <= 254;
}

/**
 * Mask email address for logging (show first 2 chars and domain)
 */
export function maskEmail(email: string): string {
  if (!email || typeof email !== 'string') return '[invalid]';

  const parts = email.split('@');
  if (parts.length !== 2) return '[invalid]';

  const [local, domain] = parts;
  const maskedLocal =
    local.length > 2 ? local.slice(0, 2) + '***' : '***';

  return `${maskedLocal}@${domain}`;
}

/**
 * Validate numeric value within range
 */
export function isValidNumberInRange(
  value: number | string | null | undefined,
  min: number,
  max: number
): boolean {
  if (value === null || value === undefined) return false;

  const num = typeof value === 'string' ? parseFloat(value) : value;

  if (isNaN(num)) return false;
  if (!isFinite(num)) return false;

  return num >= min && num <= max;
}

/**
 * Parse and validate numeric parameter with bounds
 */
export function parseNumericParam(
  value: string | null,
  defaultValue: number,
  min: number,
  max: number
): number {
  if (!value) return defaultValue;

  const parsed = parseFloat(value);

  if (isNaN(parsed) || !isFinite(parsed)) return defaultValue;

  return Math.max(min, Math.min(max, parsed));
}

/**
 * Validate Twitter/X search query
 */
export function isValidTwitterQuery(query: string): boolean {
  if (!query || typeof query !== 'string') return false;

  // Max length 512 characters (Twitter's limit)
  if (query.length > 512) return false;

  // Must not be empty after trimming
  if (query.trim().length === 0) return false;

  return true;
}

/**
 * Sanitize Twitter query - trim and limit length
 */
export function sanitizeTwitterQuery(query: string): string {
  return query.trim().slice(0, 512);
}

/**
 * Validate array of sectors
 */
export function isValidSectorList(sectors: string[]): boolean {
  const validSectors = [
    'Technology',
    'Healthcare',
    'Financial Services',
    'Consumer Cyclical',
    'Communication Services',
    'Industrials',
    'Consumer Defensive',
    'Energy',
    'Basic Materials',
    'Real Estate',
    'Utilities',
  ];

  return sectors.every((s) => validSectors.includes(s));
}

/**
 * Validate sentiment filter value
 */
export function isValidSentimentFilter(
  value: string
): value is 'positive' | 'neutral' | 'negative' | 'any' {
  return ['positive', 'neutral', 'negative', 'any'].includes(value);
}

/**
 * Sanitize string for logging - remove potentially sensitive patterns
 */
export function sanitizeForLog(value: string): string {
  if (!value || typeof value !== 'string') return '[empty]';

  // Truncate long strings
  let sanitized = value.slice(0, 200);

  // Replace potential API keys (long alphanumeric strings)
  sanitized = sanitized.replace(
    /[a-zA-Z0-9]{20,}/g,
    '[REDACTED]'
  );

  // Replace email addresses
  sanitized = sanitized.replace(
    /[^\s@]+@[^\s@]+\.[^\s@]+/g,
    '[EMAIL]'
  );

  return sanitized;
}

/**
 * Validate HTTP URL
 */
export function isValidHttpUrl(urlString: string): boolean {
  try {
    const url = new URL(urlString);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}

/**
 * Create a safe error message for client response
 * Strips potentially sensitive information
 */
export function createSafeErrorMessage(
  error: unknown,
  fallbackMessage: string = 'An error occurred'
): string {
  if (error instanceof Error) {
    // Don't expose stack traces or internal paths
    const message = error.message;

    // Filter out sensitive patterns
    if (
      message.includes('ECONNREFUSED') ||
      message.includes('ETIMEDOUT')
    ) {
      return 'Service temporarily unavailable';
    }

    if (message.includes('API key') || message.includes('apikey')) {
      return 'API configuration error';
    }

    if (message.includes('/') && message.includes('.')) {
      // Might contain file paths
      return fallbackMessage;
    }

    // Return first 100 chars of generic messages
    return message.slice(0, 100);
  }

  return fallbackMessage;
}
