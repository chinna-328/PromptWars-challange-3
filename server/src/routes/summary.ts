import { Router } from 'express';
import type { Period } from '../../../shared/dates';
import { todayISO } from '../../../shared/dates';
import type { Summary } from '../../../shared/types';
import type { ActivityRepo } from '../db/activityRepo';
import type { TtlCache } from '../lib/cache';
import { summaryQuerySchema } from '../schemas/activitySchemas';
import { validate, parsed } from '../middleware/validate';
import { getSummary } from '../services/summaryService';

/**
 * GET /api/summary?period=day|week|month — dashboard totals, comparison,
 * category breakdown and 8-week trend, all SQL-aggregated.
 * PERF: read-heavy endpoint, recomputed only after writes — responses are
 * served from the shared TTL cache (keyed by period and day) until an
 * activity write invalidates it or the TTL lapses.
 *
 * @param repo - activity repository
 * @param cache - shared response cache (cleared on writes)
 * @returns configured router
 */
export function summaryRouter(repo: ActivityRepo, cache: TtlCache): Router {
  const router = Router();

  router.get('/', validate(summaryQuerySchema, 'query'), (_req, res) => {
    res.set('Cache-Control', 'private, max-age=30');
    const { period } = parsed<{ period: Period }>(res.locals, 'query');
    const cacheKey = `summary:${period}:${todayISO()}`;
    const cached = cache.get<Summary>(cacheKey);
    if (cached) {
      res.json(cached);
      return;
    }
    const summary = getSummary(repo, period);
    cache.set(cacheKey, summary);
    res.json(summary);
  });

  return router;
}
