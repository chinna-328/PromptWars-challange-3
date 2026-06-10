import { addDays, todayISO, weekRange } from '../../../shared/dates';
import type { GoalStatus } from '../../../shared/types';
import type { ActivityRepo } from '../db/activityRepo';
import type { GoalRepo } from '../db/goalRepo';

/** Upper bound of distinct dates fetched for streak computation. */
const STREAK_LOOKBACK_DAYS = 366;

/**
 * Counts consecutive logged days ending today or yesterday (a streak is
 * not broken until a full day has passed without logging). Pure function.
 *
 * @param datesDesc - distinct activity dates, newest first
 * @param today - ISO date for "today"
 * @returns length of the current streak in days
 */
export function computeStreak(datesDesc: string[], today: string): number {
  if (datesDesc.length === 0) return 0;
  const newest = datesDesc[0];
  if (newest !== today && newest !== addDays(today, -1)) return 0;
  let streak = 1;
  for (let i = 1; i < datesDesc.length; i += 1) {
    if (datesDesc[i] !== addDays(datesDesc[i - 1] ?? '', -1)) break;
    streak += 1;
  }
  return streak;
}

/**
 * Share of the weekly budget already used, 0–100, capped at 100.
 * @param thisWeekKg - emissions so far this week
 * @param targetKg - weekly budget
 * @returns whole-number percentage
 */
export function budgetUsedPct(thisWeekKg: number, targetKg: number): number {
  return Math.min(100, Math.round((thisWeekKg / targetKg) * 100));
}

/**
 * Builds the goal status: active target, this week's total, budget usage
 * and the current logging streak.
 *
 * @param goalRepo - goals repository
 * @param activityRepo - activities repository
 * @param now - injectable clock for deterministic tests
 * @returns goal status payload for GET /api/goals
 */
export function getGoalStatus(
  goalRepo: GoalRepo,
  activityRepo: ActivityRepo,
  now: Date = new Date(),
): GoalStatus {
  const today = todayISO(now);
  const goal = goalRepo.latest();
  const thisWeekKg = activityRepo.sumBetween(weekRange(today));
  const streakDays = computeStreak(activityRepo.recentDates(STREAK_LOOKBACK_DAYS), today);
  return {
    weeklyTargetKg: goal?.weekly_target_kg ?? null,
    thisWeekKg,
    budgetUsedPct: goal ? budgetUsedPct(thisWeekKg, goal.weekly_target_kg) : null,
    streakDays,
  };
}
