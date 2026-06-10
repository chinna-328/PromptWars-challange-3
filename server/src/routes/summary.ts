import { Router } from 'express';
import type { Period } from '../../../shared/dates';
import type { ActivityRepo } from '../db/activityRepo';
import { summaryQuerySchema } from '../schemas/activitySchemas';
import { validate, parsed } from '../middleware/validate';
import { getSummary } from '../services/summaryService';

/**
 * GET /api/summary?period=day|week|month — dashboard totals, comparison,
 * category breakdown and 8-week trend, all SQL-aggregated.
 *
 * @param repo - activity repository
 * @returns configured router
 */
export function summaryRouter(repo: ActivityRepo): Router {
  const router = Router();

  router.get('/', validate(summaryQuerySchema, 'query'), (_req, res) => {
    const { period } = parsed<{ period: Period }>(res.locals, 'query');
    res.json(getSummary(repo, period));
  });

  return router;
}
