import { Router } from 'express';
import { addDays, todayISO } from '../../../shared/dates';
import type { Insight } from '../../../shared/types';
import type { ActivityRepo } from '../db/activityRepo';
import type { TtlCache } from '../lib/cache';
import { computeInsights } from '../services/insightService';
import { SHORT_TRIP_KM, weekStatsFromAggregates } from '../services/insightStats';

/**
 * GET /api/insights — runs the pure rule engine over the current rolling
 * 7-day window, comparing against the previous 7 days.
 * PERF: inputs are two SQL aggregate queries (per-type GROUP BY + one
 * SUM) — no activity rows are fetched — and the response is served from
 * the shared TTL cache until the next activity write.
 *
 * @param repo - activity repository
 * @param cache - shared response cache (cleared on writes)
 * @returns configured router
 */
export function insightsRouter(repo: ActivityRepo, cache: TtlCache): Router {
  const router = Router();

  router.get('/', (_req, res) => {
    res.set('Cache-Control', 'private, max-age=30');
    const today = todayISO();
    const cacheKey = `insights:${today}`;
    const cached = cache.get<Insight[]>(cacheKey);
    if (cached) {
      res.json({ data: cached });
      return;
    }
    const thisWeek = { from: addDays(today, -6), to: today };
    const lastWeek = { from: addDays(today, -13), to: addDays(today, -7) };
    const insights = computeInsights({
      stats: weekStatsFromAggregates(repo.statsByType(thisWeek, SHORT_TRIP_KM)),
      lastWeekKg: repo.sumBetween(lastWeek),
    });
    cache.set(cacheKey, insights);
    res.json({ data: insights });
  });

  return router;
}
