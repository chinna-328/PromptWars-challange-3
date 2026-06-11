/**
 * Rate limiting for the API: a general limiter on all routes and a
 * stricter one for writes. Key invariant: limits are injectable so tests
 * can exercise 429 behaviour without waiting out real windows.
 */
import { rateLimit, type RateLimitRequestHandler } from 'express-rate-limit';

/** Tunable limits — tests inject high values, prod uses the defaults. */
export interface RateLimitOptions {
  windowMs?: number;
  /** Max requests per window across all /api routes. */
  limit?: number;
  /** Stricter max for write endpoints (POST/PUT/DELETE). */
  writeLimit?: number;
}

/** The two limiters applied to the API. */
export interface RateLimiters {
  general: RateLimitRequestHandler;
  write: RateLimitRequestHandler;
}

const WINDOW_15_MIN = 15 * 60 * 1000;

const limitedResponse = {
  error: { code: 'RATE_LIMITED', message: 'Too many requests, please try again later' },
};

/**
 * Creates the API rate limiters: 100 req / 15 min generally, and a
 * stricter 30 req / 15 min on write endpoints, matching the threat model
 * in SECURITY.md (single-user app, abuse/typo-flood protection).
 *
 * @param options - overrides used by tests; production uses defaults
 * @returns general and write limiters
 */
export function createRateLimiters(options: RateLimitOptions = {}): RateLimiters {
  const windowMs = options.windowMs ?? WINDOW_15_MIN;
  const shared = {
    windowMs,
    standardHeaders: true,
    legacyHeaders: false,
    message: limitedResponse,
  } as const;
  return {
    general: rateLimit({ ...shared, limit: options.limit ?? 100 }),
    write: rateLimit({ ...shared, limit: options.writeLimit ?? 30 }),
  };
}
