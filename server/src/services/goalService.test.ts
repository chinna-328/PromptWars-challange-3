import { describe, expect, it } from 'vitest';
import { budgetUsedPct, computeStreak, getGoalStatus } from './goalService';
import { createDb } from '../db';
import { ActivityRepo } from '../db/activityRepo';
import { GoalRepo } from '../db/goalRepo';
import { todayISO, addDays } from '../../../shared/dates';

const TODAY = '2026-06-10';

describe('computeStreak', () => {
  it('returns 0 when nothing has been logged', () => {
    expect(computeStreak([], TODAY)).toBe(0);
  });

  it('counts consecutive days ending today', () => {
    expect(computeStreak(['2026-06-10', '2026-06-09', '2026-06-08'], TODAY)).toBe(3);
  });

  it('keeps a streak alive when the last log was yesterday', () => {
    expect(computeStreak(['2026-06-09', '2026-06-08'], TODAY)).toBe(2);
  });

  it('returns 0 when the last log is older than yesterday', () => {
    expect(computeStreak(['2026-06-07', '2026-06-06'], TODAY)).toBe(0);
  });

  it('stops counting at the first gap', () => {
    expect(computeStreak(['2026-06-10', '2026-06-09', '2026-06-07'], TODAY)).toBe(2);
  });
});

describe('budgetUsedPct', () => {
  it('returns the rounded share of the budget used', () => {
    expect(budgetUsedPct(12.5, 50)).toBe(25);
  });

  it('caps at 100 when the budget is exceeded', () => {
    expect(budgetUsedPct(80, 50)).toBe(100);
  });

  it('returns 0 for an untouched budget', () => {
    expect(budgetUsedPct(0, 50)).toBe(0);
  });
});

describe('getGoalStatus', () => {
  it('combines target, weekly total, budget usage and streak', () => {
    const db = createDb(':memory:');
    const activityRepo = new ActivityRepo(db);
    const goalRepo = new GoalRepo(db);
    const today = todayISO();

    goalRepo.setTarget(50);
    activityRepo.create({
      category: 'transport',
      activityType: 'car_petrol',
      quantity: 100,
      emissionsKg: 19.2,
      date: today,
      note: null,
    });
    activityRepo.create({
      category: 'food',
      activityType: 'meal_vegan',
      quantity: 1,
      emissionsKg: 0.9,
      date: addDays(today, -1),
      note: null,
    });

    const status = getGoalStatus(goalRepo, activityRepo);
    expect(status.weeklyTargetKg).toBe(50);
    expect(status.thisWeekKg).toBeGreaterThanOrEqual(19.2);
    expect(status.budgetUsedPct).toBeGreaterThan(0);
    expect(status.streakDays).toBeGreaterThanOrEqual(2);
  });

  it('returns null target and usage when no goal is set', () => {
    const db = createDb(':memory:');
    const status = getGoalStatus(new GoalRepo(db), new ActivityRepo(db));
    expect(status.weeklyTargetKg).toBeNull();
    expect(status.budgetUsedPct).toBeNull();
    expect(status.thisWeekKg).toBe(0);
    expect(status.streakDays).toBe(0);
  });
});
