import { Router } from 'express';
import { addDays, todayISO } from '../../../shared/dates';
import type { ActivityRepo } from '../db/activityRepo';
import { computeInsights } from '../services/insightService';

/** More than any plausible week of single-user logging. */
const WEEK_FETCH_LIMIT = 500;

/**
 * GET /api/insights — runs the pure rule engine over the current rolling
 * 7-day window, comparing against the previous 7 days.
 *
 * @param repo - activity repository
 * @returns configured router
 */
export function insightsRouter(repo: ActivityRepo): Router {
  const router = Router();

  router.get('/', (_req, res) => {
    const today = todayISO();
    const thisWeek = { from: addDays(today, -6), to: today };
    const lastWeek = { from: addDays(today, -13), to: addDays(today, -7) };
    const insights = computeInsights({
      thisWeek: repo.list({ ...thisWeek, limit: WEEK_FETCH_LIMIT, offset: 0 }),
      lastWeekKg: repo.sumBetween(lastWeek),
    });
    res.json({ data: insights });
  });

  return router;
}
