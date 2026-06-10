import type { Express } from 'express';
import { calculateEmissions } from '../shared/calculateEmissions';
import type { ActivityType } from '../shared/emissionFactors';
import { EMISSION_FACTORS } from '../shared/emissionFactors';
import { todayISO } from '../shared/dates';
import type { ActivityRecord } from '../shared/types';
import { createDb } from '../server/src/db';
import { createApp } from '../server/src/app';
import type { RateLimitOptions } from '../server/src/middleware/rateLimiter';

/**
 * Builds an isolated app instance backed by an in-memory SQLite database.
 * Rate limits default to effectively-unlimited so suites don't trip them;
 * the dedicated rate-limit test passes tight overrides.
 *
 * @param rateLimit - optional limiter overrides
 * @returns Express app ready for supertest
 */
export function makeTestApp(rateLimit?: RateLimitOptions): Express {
  return makeTestAppWithDb(rateLimit).app;
}

/**
 * Like {@link makeTestApp} but also exposes the database handle, for tests
 * that need to manipulate rows behind the API (e.g. cache behaviour).
 *
 * @param rateLimit - optional limiter overrides
 * @returns the app plus its underlying in-memory database
 */
export function makeTestAppWithDb(rateLimit?: RateLimitOptions): {
  app: Express;
  db: ReturnType<typeof createDb>;
} {
  const db = createDb(':memory:');
  const app = createApp({
    db,
    rateLimit: rateLimit ?? { limit: 100000, writeLimit: 100000 },
  });
  return { app, db };
}

/**
 * Builds a valid POST /api/activities payload.
 * @param overrides - fields to override on the default petrol-car entry
 * @returns request body
 */
export function activityPayload(
  overrides: Partial<{
    category: string;
    activityType: string;
    quantity: number;
    date: string;
    note: string;
  }> = {},
): Record<string, unknown> {
  return {
    category: 'transport',
    activityType: 'car_petrol',
    quantity: 10,
    date: todayISO(),
    ...overrides,
  };
}

let nextId = 1;

/**
 * Builds an in-memory ActivityRecord for pure-function tests (insights),
 * with emissions derived from the real factors.
 *
 * @param activityType - activity type id
 * @param quantity - quantity in the activity's unit
 * @param date - ISO date (defaults to today)
 * @returns a fully-populated record
 */
export function record(
  activityType: ActivityType,
  quantity: number,
  date?: string,
): ActivityRecord {
  nextId += 1;
  return {
    id: nextId,
    category: EMISSION_FACTORS[activityType].category,
    activityType,
    quantity,
    emissionsKg: quantity > 0 ? calculateEmissions(activityType, quantity) : 0,
    date: date ?? todayISO(),
    note: null,
    createdAt: new Date().toISOString(),
  };
}
