import { Router, type RequestHandler } from 'express';
import type { ActivityRepo } from '../db/activityRepo';
import type { GoalRepo } from '../db/goalRepo';
import { goalInputSchema, type GoalInputParsed } from '../schemas/goalSchemas';
import { validate, parsed } from '../middleware/validate';
import { getGoalStatus } from '../services/goalService';

/**
 * Goal routes: GET /api/goals returns target + progress + streak,
 * POST /api/goals sets a new weekly target.
 *
 * @param goalRepo - goals repository
 * @param activityRepo - activities repository (for progress/streak)
 * @param writeLimiter - stricter rate limiter for the write endpoint
 * @returns configured router
 */
export function goalsRouter(
  goalRepo: GoalRepo,
  activityRepo: ActivityRepo,
  writeLimiter: RequestHandler,
): Router {
  const router = Router();

  router.get('/', (_req, res) => {
    res.json(getGoalStatus(goalRepo, activityRepo));
  });

  router.post('/', writeLimiter, validate(goalInputSchema), (_req, res) => {
    const { weeklyTargetKg } = parsed<GoalInputParsed>(res.locals, 'body');
    goalRepo.setTarget(weeklyTargetKg);
    res.status(201).json(getGoalStatus(goalRepo, activityRepo));
  });

  return router;
}
