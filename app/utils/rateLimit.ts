/**
 * Simple in-memory rate limiter for API endpoints
 *
 * Note: For production with multiple server instances, consider using
 * Redis or another distributed cache for rate limiting.
 */

interface RateLimitRecord {
  count: number;
  resetTime: number;
}

// In-memory store for rate limits
const rateLimitStore = new Map<string, RateLimitRecord>();

// Clean up expired entries periodically (every 5 minutes)
const CLEANUP_INTERVAL = 5 * 60 * 1000;
let lastCleanup = Date.now();

function cleanupExpiredEntries(): void {
  const now = Date.now();
  if (now - lastCleanup < CLEANUP_INTERVAL) return;

  for (const [key, record] of rateLimitStore.entries()) {
    if (record.resetTime < now) {
      rateLimitStore.delete(key);
    }
  }
  lastCleanup = now;
}

export interface RateLimitConfig {
  /** Maximum number of requests allowed in the window */
  maxRequests: number;
  /** Time window in milliseconds */
  windowMs: number;
  /** Optional key prefix for different endpoints */
  keyPrefix?: string;
}

export interface RateLimitResult {
  /** Whether the request is allowed */
  allowed: boolean;
  /** Remaining requests in the current window */
  remaining: number;
  /** Time in milliseconds until the rate limit resets */
  resetIn: number;
  /** Total limit */
  limit: number;
}

/**
 * Get client identifier from request
 * Uses X-Forwarded-For header (for proxies) or falls back to a default key
 */
export function getClientIdentifier(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) {
    // Get the first IP in the chain (original client)
    return forwarded.split(',')[0].trim();
  }

  const realIp = request.headers.get('x-real-ip');
  if (realIp) {
    return realIp;
  }

  // Fallback for local development
  return 'anonymous';
}

/**
 * Check rate limit for a client
 */
export function checkRateLimit(
  clientId: string,
  config: RateLimitConfig
): RateLimitResult {
  cleanupExpiredEntries();

  const key = config.keyPrefix
    ? `${config.keyPrefix}:${clientId}`
    : clientId;
  const now = Date.now();

  let record = rateLimitStore.get(key);

  // If no record exists or the window has expired, create a new one
  if (!record || record.resetTime < now) {
    record = {
      count: 0,
      resetTime: now + config.windowMs,
    };
    rateLimitStore.set(key, record);
  }

  // Increment the count
  record.count++;

  const allowed = record.count <= config.maxRequests;
  const remaining = Math.max(0, config.maxRequests - record.count);
  const resetIn = Math.max(0, record.resetTime - now);

  return {
    allowed,
    remaining,
    resetIn,
    limit: config.maxRequests,
  };
}

/**
 * Default rate limit configurations for different endpoints
 */
export const RateLimitConfigs = {
  // General API endpoints - 100 requests per minute
  api: {
    maxRequests: 100,
    windowMs: 60 * 1000,
    keyPrefix: 'api',
  } as RateLimitConfig,

  // Stock quote endpoints - 60 requests per minute
  stockQuote: {
    maxRequests: 60,
    windowMs: 60 * 1000,
    keyPrefix: 'stock-quote',
  } as RateLimitConfig,

  // Screener endpoints - 30 requests per minute (expensive operation)
  screener: {
    maxRequests: 30,
    windowMs: 60 * 1000,
    keyPrefix: 'screener',
  } as RateLimitConfig,

  // Twitter search - 20 requests per minute
  twitter: {
    maxRequests: 20,
    windowMs: 60 * 1000,
    keyPrefix: 'twitter',
  } as RateLimitConfig,

  // Risk monitor - 30 requests per minute
  riskMonitor: {
    maxRequests: 30,
    windowMs: 60 * 1000,
    keyPrefix: 'risk-monitor',
  } as RateLimitConfig,

  // Watchlist operations - 50 requests per minute
  watchlist: {
    maxRequests: 50,
    windowMs: 60 * 1000,
    keyPrefix: 'watchlist',
  } as RateLimitConfig,

  // Admin/sensitive endpoints - 10 requests per minute
  admin: {
    maxRequests: 10,
    windowMs: 60 * 1000,
    keyPrefix: 'admin',
  } as RateLimitConfig,
} as const;

/**
 * Create rate limit headers for response
 */
export function createRateLimitHeaders(result: RateLimitResult): HeadersInit {
  return {
    'X-RateLimit-Limit': result.limit.toString(),
    'X-RateLimit-Remaining': result.remaining.toString(),
    'X-RateLimit-Reset': Math.ceil(result.resetIn / 1000).toString(),
  };
}
