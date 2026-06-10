import { describe, expect, it } from 'vitest';
import { buildWeekStats, weekStatsFromAggregates, SHORT_TRIP_KM } from './insightStats';
import { createDb } from '../db';
import { ActivityRepo } from '../db/activityRepo';
import { record } from '../../../tests/helpers';
import { todayISO, addDays } from '../../../shared/dates';

describe('weekStatsFromAggregates', () => {
  it('produces identical stats from SQL aggregates and from raw records', () => {
    const today = todayISO();
    const records = [
      record('car_petrol', 3, today), // short trip
      record('car_petrol', 40, today),
      record('car_ev', 5, addDays(today, -1)), // short trip
      record('bicycle', 4, today),
      record('flight_short', 800, today),
      record('meal_red_meat', 2, today),
      record('electricity', 12, addDays(today, -2)),
      record('lpg', 3, today),
      record('clothing_item', 2, today),
    ];

    // Path A: pure fold over in-memory records.
    const fromRecords = buildWeekStats(records);

    // Path B: rows through SQLite GROUP BY, then the same fold.
    const repo = new ActivityRepo(createDb(':memory:'));
    for (const entry of records) {
      repo.create({
        category: entry.category,
        activityType: entry.activityType,
        quantity: entry.quantity,
        emissionsKg: entry.emissionsKg,
        date: entry.date,
        note: null,
      });
    }
    const range = { from: addDays(today, -6), to: today };
    const fromSql = weekStatsFromAggregates(repo.statsByType(range, SHORT_TRIP_KM));

    // SQL and JS sum in different orders → compare floats to 9 decimals.
    expect(fromSql.totalKg).toBeCloseTo(fromRecords.totalKg, 9);
    for (const category of ['transport', 'energy', 'food', 'shopping'] as const) {
      expect(fromSql.categoryKg[category]).toBeCloseTo(fromRecords.categoryKg[category], 9);
    }
    const { totalKg: _a, categoryKg: _b, ...sqlRest } = fromSql;
    const { totalKg: _c, categoryKg: _d, ...recordRest } = fromRecords;
    expect(sqlRest).toEqual(recordRest);
    expect(fromSql.carKm).toBeCloseTo(48, 6);
    expect(fromSql.shortCarTripCount).toBe(2);
    expect(fromSql.shortCarTripKm).toBeCloseTo(8, 6);
    expect(fromSql.greenTripCount).toBe(1);
    expect(fromSql.entryCount).toBe(9);
  });

  it('returns zeroed stats for an empty week', () => {
    const stats = weekStatsFromAggregates([]);
    expect(stats.totalKg).toBe(0);
    expect(stats.entryCount).toBe(0);
    expect(stats.categoryKg).toEqual({ transport: 0, energy: 0, food: 0, shopping: 0 });
  });
});
