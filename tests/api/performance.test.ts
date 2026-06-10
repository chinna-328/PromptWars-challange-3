import { describe, expect, it, vi, afterEach } from 'vitest';
import request from 'supertest';
import { activityPayload, makeTestApp, makeTestAppWithDb } from '../helpers';
import { TtlCache } from '../../server/src/lib/cache';
import { createDb } from '../../server/src/db';
import { ActivityRepo } from '../../server/src/db/activityRepo';
import { addDays, todayISO, weekRange } from '../../shared/dates';

afterEach(() => {
  vi.useRealTimers();
});

describe('TtlCache', () => {
  it('returns cached values within the TTL and expires them after', () => {
    vi.useFakeTimers();
    const cache = new TtlCache(30_000);
    cache.set('k', 42);
    expect(cache.get('k')).toBe(42);
    vi.advanceTimersByTime(29_999);
    expect(cache.get('k')).toBe(42);
    vi.advanceTimersByTime(2);
    expect(cache.get('k')).toBeUndefined();
  });

  it('clear() drops every entry', () => {
    const cache = new TtlCache(30_000);
    cache.set('a', 1);
    cache.set('b', 2);
    cache.clear();
    expect(cache.get('a')).toBeUndefined();
    expect(cache.get('b')).toBeUndefined();
  });
});

describe('summary response cache', () => {
  it('serves summary from cache within TTL without re-querying', async () => {
    const { app, db } = makeTestAppWithDb();
    await request(app)
      .post('/api/activities')
      .send(activityPayload({ quantity: 10 }));

    const first = await request(app).get('/api/summary?period=week');
    expect(first.body.totalKg).toBeCloseTo(1.92, 5);

    // Sneak a row in behind the API: a cached response must NOT see it.
    db.prepare(
      `INSERT INTO activities (category, activity_type, quantity, emissions_kg, date, note)
       VALUES ('energy', 'electricity', 10, 8.2, ?, NULL)`,
    ).run(todayISO());
    const cached = await request(app).get('/api/summary?period=week');
    expect(cached.body.totalKg).toBeCloseTo(1.92, 5); // unchanged → from cache

    // A write through the API invalidates the cache; the next read is fresh.
    await request(app)
      .post('/api/activities')
      .send(activityPayload({ quantity: 5 }));
    const fresh = await request(app).get('/api/summary?period=week');
    expect(fresh.body.totalKg).toBeCloseTo(1.92 + 8.2 + 0.96, 5);
  });

  it('marks reads cacheable (private, max-age=30) and writes no-store', async () => {
    const app = makeTestApp();
    const read = await request(app).get('/api/summary');
    expect(read.headers['cache-control']).toBe('private, max-age=30');
    const write = await request(app).post('/api/activities').send(activityPayload());
    expect(write.headers['cache-control']).toBe('no-store');
  });
});

describe('query plans and scale', () => {
  it('answers every aggregate from the covering index — no table scans', () => {
    const db = createDb(':memory:');
    const plans = [
      'SELECT COALESCE(SUM(emissions_kg),0) FROM activities WHERE date BETWEEN ? AND ?',
      `SELECT category, SUM(emissions_kg) FROM activities
       WHERE date BETWEEN ? AND ? GROUP BY category`,
      `SELECT DATE(date, '-' || ((CAST(strftime('%w', date) AS INTEGER) + 6) % 7) || ' days') AS ws,
       SUM(emissions_kg) FROM activities WHERE date BETWEEN ? AND ? GROUP BY ws`,
    ].map((sql) =>
      (db.prepare(`EXPLAIN QUERY PLAN ${sql}`).all('a', 'b') as { detail: string }[])
        .map((row) => row.detail)
        .join('; '),
    );
    for (const plan of plans) {
      expect(plan).toContain('USING COVERING INDEX idx_activities_date_category');
      expect(plan).not.toContain('SCAN activities');
    }
  });

  it('aggregates a year of 10,000 activities well under 100ms', () => {
    const repo = new ActivityRepo(createDb(':memory:'));
    const today = todayISO();
    for (let i = 0; i < 10_000; i += 1) {
      repo.create({
        category: 'transport',
        activityType: 'car_petrol',
        quantity: 5,
        emissionsKg: 0.96,
        date: addDays(today, -(i % 365)),
        note: null,
      });
    }
    const start = performance.now();
    const total = repo.sumBetween(weekRange(today));
    const byCategory = repo.sumByCategory(weekRange(today));
    const trend = repo.sumByWeek({ from: addDays(today, -55), to: today });
    const elapsed = performance.now() - start;

    expect(total).toBeGreaterThan(0);
    expect(byCategory.length).toBeGreaterThan(0);
    expect(trend.length).toBeGreaterThan(0);
    expect(elapsed).toBeLessThan(100);
  });
});
