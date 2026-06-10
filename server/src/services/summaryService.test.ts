import { describe, expect, it } from 'vitest';
import { getSummary, percentChange } from './summaryService';
import { createDb } from '../db';
import { ActivityRepo, type ActivityWriteModel } from '../db/activityRepo';

/** Fixed clock: Wednesday 2026-06-10 → week = 06-08..06-14. */
const NOW = new Date(Date.UTC(2026, 5, 10, 12));

const entry = (overrides: Partial<ActivityWriteModel>): ActivityWriteModel => ({
  category: 'transport',
  activityType: 'car_petrol',
  quantity: 10,
  emissionsKg: 1.92,
  date: '2026-06-10',
  note: null,
  ...overrides,
});

const seededRepo = (): ActivityRepo => {
  const repo = new ActivityRepo(createDb(':memory:'));
  repo.create(entry({ emissionsKg: 5, date: '2026-06-10' })); // this week
  repo.create(entry({ emissionsKg: 3, date: '2026-06-08' })); // this week (Mon)
  repo.create(
    entry({
      category: 'food',
      activityType: 'meal_vegan',
      quantity: 2,
      emissionsKg: 1.8,
      date: '2026-06-09',
    }),
  );
  repo.create(entry({ emissionsKg: 4, date: '2026-06-03' })); // last week
  repo.create(entry({ emissionsKg: 2, date: '2026-05-01' })); // last month
  return repo;
};

describe('percentChange', () => {
  it('computes a signed percentage rounded to one decimal', () => {
    expect(percentChange(11, 10)).toBe(10);
    expect(percentChange(9, 10)).toBe(-10);
    expect(percentChange(10.5, 9)).toBeCloseTo(16.7, 5);
  });

  it('returns null when the previous total is zero (undefined change)', () => {
    expect(percentChange(5, 0)).toBeNull();
  });
});

describe('getSummary', () => {
  it('totals the current week and compares against the previous week', () => {
    const summary = getSummary(seededRepo(), 'week', NOW);
    expect(summary.range).toEqual({ from: '2026-06-08', to: '2026-06-14' });
    expect(summary.totalKg).toBeCloseTo(9.8, 5);
    expect(summary.previousTotalKg).toBeCloseTo(4, 5);
    expect(summary.changePct).toBeCloseTo(145, 1);
  });

  it('zero-fills the category breakdown so all four categories are present', () => {
    const summary = getSummary(seededRepo(), 'week', NOW);
    expect(summary.byCategory).toHaveLength(4);
    const byName = Object.fromEntries(summary.byCategory.map((c) => [c.category, c.totalKg]));
    expect(byName.transport).toBeCloseTo(8, 5);
    expect(byName.food).toBeCloseTo(1.8, 5);
    expect(byName.energy).toBe(0);
    expect(byName.shopping).toBe(0);
  });

  it('returns an 8-point weekly trend ending with the current week', () => {
    const summary = getSummary(seededRepo(), 'week', NOW);
    expect(summary.trend).toHaveLength(8);
    expect(summary.trend[7]?.weekStart).toBe('2026-06-08');
    expect(summary.trend[7]?.totalKg).toBeCloseTo(9.8, 5);
    expect(summary.trend[6]?.totalKg).toBeCloseTo(4, 5);
  });

  it('supports day and month periods', () => {
    const day = getSummary(seededRepo(), 'day', NOW);
    expect(day.range).toEqual({ from: '2026-06-10', to: '2026-06-10' });
    expect(day.totalKg).toBeCloseTo(5, 5);

    const month = getSummary(seededRepo(), 'month', NOW);
    expect(month.range).toEqual({ from: '2026-06-01', to: '2026-06-30' });
    expect(month.totalKg).toBeCloseTo(13.8, 5);
    expect(month.previousTotalKg).toBeCloseTo(2, 5);
  });

  it('buckets week-boundary days correctly: Sunday joins its Monday, next Monday starts fresh', () => {
    const repo = new ActivityRepo(createDb(':memory:'));
    repo.create(entry({ emissionsKg: 1, date: '2026-06-07' })); // Sunday → week of 06-01
    repo.create(entry({ emissionsKg: 2, date: '2026-06-08' })); // Monday → week of 06-08
    const summary = getSummary(repo, 'week', NOW);
    expect(summary.trend[6]).toEqual({ weekStart: '2026-06-01', totalKg: 1 });
    expect(summary.trend[7]).toEqual({ weekStart: '2026-06-08', totalKg: 2 });
  });

  it('handles an empty database without errors', () => {
    const summary = getSummary(new ActivityRepo(createDb(':memory:')), 'week', NOW);
    expect(summary.totalKg).toBe(0);
    expect(summary.changePct).toBeNull();
    expect(summary.trend.every((point) => point.totalKg === 0)).toBe(true);
  });
});
