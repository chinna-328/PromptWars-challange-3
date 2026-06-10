import type { ActivityRecord } from '../../../shared/types';
import type { Category } from '../../../shared/emissionFactors';
import type { TypeAggregateRow } from '../db/activityRepo';

/** A car trip short enough to cycle or walk instead, in km. */
export const SHORT_TRIP_KM = 5;

/** Aggregated view of one week of activity, consumed by the insight rules. */
export interface WeekStats {
  totalKg: number;
  categoryKg: Record<Category, number>;
  entryCount: number;
  /** Total km driven by car (petrol/diesel/EV). */
  carKm: number;
  /** km and count of individual car trips ≤ SHORT_TRIP_KM. */
  shortCarTripKm: number;
  shortCarTripCount: number;
  redMeatMeals: number;
  electricityKwh: number;
  lpgKg: number;
  shoppingKg: number;
  /** Logged zero-emission trips (bicycle/walk). */
  greenTripCount: number;
  flightShortKm: number;
}

const CAR_TYPES = new Set(['car_petrol', 'car_diesel', 'car_ev']);
const GREEN_TYPES = new Set(['bicycle', 'walk']);

const emptyStats = (): WeekStats => ({
  totalKg: 0,
  categoryKg: { transport: 0, energy: 0, food: 0, shopping: 0 },
  entryCount: 0,
  carKm: 0,
  shortCarTripKm: 0,
  shortCarTripCount: 0,
  redMeatMeals: 0,
  electricityKwh: 0,
  lpgKg: 0,
  shoppingKg: 0,
  greenTripCount: 0,
  flightShortKm: 0,
});

/**
 * Folds SQL per-activity-type aggregates into the WeekStats the insight
 * rules reason about. PERF: this runs over O(activity types) rows — the
 * per-row aggregation already happened in the database (GROUP BY), so the
 * engine's cost is independent of how many activities were logged.
 *
 * @param rows - per-type aggregates from ActivityRepo.statsByType
 * @returns aggregated stats for the week
 */
export function weekStatsFromAggregates(rows: TypeAggregateRow[]): WeekStats {
  const stats = emptyStats();
  for (const row of rows) {
    stats.totalKg += row.totalKg;
    stats.categoryKg[row.category] += row.totalKg;
    stats.entryCount += row.entryCount;
    if (CAR_TYPES.has(row.activityType)) {
      stats.carKm += row.totalQuantity;
      stats.shortCarTripKm += row.shortKm;
      stats.shortCarTripCount += row.shortCount;
    } else if (GREEN_TYPES.has(row.activityType)) {
      stats.greenTripCount += row.entryCount;
    } else if (row.activityType === 'flight_short') {
      stats.flightShortKm += row.totalQuantity;
    } else if (row.activityType === 'meal_red_meat') {
      stats.redMeatMeals += row.totalQuantity;
    } else if (row.activityType === 'electricity') {
      stats.electricityKwh += row.totalQuantity;
    } else if (row.activityType === 'lpg') {
      stats.lpgKg += row.totalQuantity;
    } else if (row.category === 'shopping') {
      stats.shoppingKg += row.totalKg;
    }
  }
  return stats;
}

/**
 * Builds WeekStats straight from activity records by first aggregating
 * them per type (the same shape SQL produces) and then delegating to
 * {@link weekStatsFromAggregates} — one fold implementation, two entry
 * points. Used by unit tests and anywhere records are already in memory.
 *
 * @param activities - records from a single 7-day window
 * @returns aggregated stats
 */
export function buildWeekStats(activities: ActivityRecord[]): WeekStats {
  const byType = new Map<string, TypeAggregateRow>();
  for (const activity of activities) {
    const row =
      byType.get(activity.activityType) ??
      ({
        activityType: activity.activityType,
        category: activity.category,
        entryCount: 0,
        totalQuantity: 0,
        totalKg: 0,
        shortKm: 0,
        shortCount: 0,
      } satisfies TypeAggregateRow);
    row.entryCount += 1;
    row.totalQuantity += activity.quantity;
    row.totalKg += activity.emissionsKg;
    if (activity.quantity <= SHORT_TRIP_KM) {
      row.shortKm += activity.quantity;
      row.shortCount += 1;
    }
    byType.set(activity.activityType, row);
  }
  return weekStatsFromAggregates([...byType.values()]);
}
