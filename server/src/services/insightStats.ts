import type { ActivityRecord } from '../../../shared/types';
import type { Category } from '../../../shared/emissionFactors';

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

/**
 * Reduces a week of activity records into the aggregate numbers the
 * insight rules reason about. Pure and O(n) over the records.
 * @param activities - records from a single 7-day window
 * @returns aggregated stats
 */
export function buildWeekStats(activities: ActivityRecord[]): WeekStats {
  const stats: WeekStats = {
    totalKg: 0,
    categoryKg: { transport: 0, energy: 0, food: 0, shopping: 0 },
    entryCount: activities.length,
    carKm: 0,
    shortCarTripKm: 0,
    shortCarTripCount: 0,
    redMeatMeals: 0,
    electricityKwh: 0,
    lpgKg: 0,
    shoppingKg: 0,
    greenTripCount: 0,
    flightShortKm: 0,
  };
  for (const activity of activities) {
    stats.totalKg += activity.emissionsKg;
    stats.categoryKg[activity.category] += activity.emissionsKg;
    accumulateByType(stats, activity);
  }
  return stats;
}

/** Folds one record into the per-activity-type counters. */
function accumulateByType(stats: WeekStats, activity: ActivityRecord): void {
  const { activityType, quantity, emissionsKg } = activity;
  if (CAR_TYPES.has(activityType)) {
    stats.carKm += quantity;
    if (quantity <= SHORT_TRIP_KM) {
      stats.shortCarTripKm += quantity;
      stats.shortCarTripCount += 1;
    }
  } else if (activityType === 'bicycle' || activityType === 'walk') {
    stats.greenTripCount += 1;
  } else if (activityType === 'flight_short') {
    stats.flightShortKm += quantity;
  } else if (activityType === 'meal_red_meat') {
    stats.redMeatMeals += quantity;
  } else if (activityType === 'electricity') {
    stats.electricityKwh += quantity;
  } else if (activityType === 'lpg') {
    stats.lpgKg += quantity;
  } else if (activity.category === 'shopping') {
    stats.shoppingKg += emissionsKg;
  }
}
