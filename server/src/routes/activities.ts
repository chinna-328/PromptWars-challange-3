import { Router, type RequestHandler } from 'express';
import type { ActivityRepo } from '../db/activityRepo';
import {
  activityInputSchema,
  idParamSchema,
  listActivitiesQuerySchema,
  type ActivityInputParsed,
  type ListActivitiesQuery,
} from '../schemas/activitySchemas';
import { validate, parsed } from '../middleware/validate';
import {
  createActivity,
  deleteActivity,
  getActivity,
  listActivities,
  updateActivity,
} from '../services/activityService';

/**
 * CRUD routes for /api/activities. Handlers stay thin: validation is
 * middleware, logic lives in activityService.
 *
 * @param repo - activity repository
 * @param writeLimiter - stricter rate limiter for mutating endpoints
 * @returns configured router
 */
export function activitiesRouter(repo: ActivityRepo, writeLimiter: RequestHandler): Router {
  const router = Router();

  router.post('/', writeLimiter, validate(activityInputSchema), (_req, res) => {
    const input = parsed<ActivityInputParsed>(res.locals, 'body');
    res.status(201).json(createActivity(repo, input));
  });

  router.get('/', validate(listActivitiesQuerySchema, 'query'), (_req, res) => {
    const query = parsed<ListActivitiesQuery>(res.locals, 'query');
    res.json(listActivities(repo, query));
  });

  router.get('/:id', validate(idParamSchema, 'params'), (_req, res) => {
    const { id } = parsed<{ id: number }>(res.locals, 'params');
    res.json(getActivity(repo, id));
  });

  router.put(
    '/:id',
    writeLimiter,
    validate(idParamSchema, 'params'),
    validate(activityInputSchema),
    (_req, res) => {
      const { id } = parsed<{ id: number }>(res.locals, 'params');
      const input = parsed<ActivityInputParsed>(res.locals, 'body');
      res.json(updateActivity(repo, id, input));
    },
  );

  router.delete('/:id', writeLimiter, validate(idParamSchema, 'params'), (_req, res) => {
    const { id } = parsed<{ id: number }>(res.locals, 'params');
    deleteActivity(repo, id);
    res.status(204).end();
  });

  return router;
}
