import {
  lastNWeeks,
  previousRange,
  rangeForPeriod,
  todayISO,
  type Period,
} from '../../../shared/dates';
import { CATEGORIES } from '../../../shared/emissionFactors';
import type { CategoryTotal, Summary, TrendPoint } from '../../../shared/types';
import type { ActivityRepo } from '../db/activityRepo';

/** Weeks shown on the dashboard trend line. */
const TREND_WEEKS = 8;

/**
 * Percent change between two totals, rounded to one decimal.
 * @param current - current period total
 * @param previous - previous period total
 * @returns signed percent change, or null when previous is 0 (undefined %)
 */
export function percentChange(current: number, previous: number): number | null {
  if (previous === 0) return null;
  return Math.round(((current - previous) / previous) * 1000) / 10;
}

/**
 * Builds the dashboard summary: totals for the requested period, the
 * comparison vs the previous period, a per-category breakdown (always all
 * four categories, zero-filled), and the 8-week trend. All totals come
 * from SQL SUM/GROUP BY on the date index — no row data is fetched.
 *
 * @param repo - activity repository
 * @param period - 'day' | 'week' | 'month'
 * @param now - injectable clock for deterministic tests
 * @returns the summary payload for GET /api/summary
 */
export function getSummary(repo: ActivityRepo, period: Period, now: Date = new Date()): Summary {
  const today = todayISO(now);
  const range = rangeForPeriod(period, today);
  const previous = previousRange(period, range);

  const totalKg = repo.sumBetween(range);
  const previousTotalKg = repo.sumBetween(previous);

  const sums = new Map(repo.sumByCategory(range).map((row) => [row.category, row.total]));
  const byCategory: CategoryTotal[] = CATEGORIES.map((category) => ({
    category,
    totalKg: sums.get(category) ?? 0,
  }));

  // One indexed SUM per week; the prepared statement is reused 8 times.
  const trend: TrendPoint[] = lastNWeeks(today, TREND_WEEKS).map((week) => ({
    weekStart: week.from,
    totalKg: repo.sumBetween(week),
  }));

  return {
    period,
    range,
    totalKg,
    previousTotalKg,
    changePct: percentChange(totalKg, previousTotalKg),
    byCategory,
    trend,
  };
}
