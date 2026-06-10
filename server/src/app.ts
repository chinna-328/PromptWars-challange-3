import express, { type Express } from 'express';
import helmet from 'helmet';
import cors from 'cors';
import type { Database } from 'better-sqlite3';
import { env } from './lib/env';
import { ActivityRepo } from './db/activityRepo';
import { GoalRepo } from './db/goalRepo';
import { createRateLimiters, type RateLimitOptions } from './middleware/rateLimiter';
import { errorHandler, notFoundHandler } from './middleware/errorHandler';
import { activitiesRouter } from './routes/activities';
import { summaryRouter } from './routes/summary';
import { insightsRouter } from './routes/insights';
import { goalsRouter } from './routes/goals';

/** Dependencies injected into the app (tests pass :memory: DB + limits). */
export interface AppOptions {
  db: Database;
  rateLimit?: RateLimitOptions;
}

/**
 * Builds the Express app with the full security middleware stack:
 * helmet, explicit-origin CORS, body size limit, rate limiting, zod
 * validation per route, and a single error boundary. Factory-style so
 * tests can build isolated instances against in-memory databases.
 *
 * @param options - database handle and optional rate-limit overrides
 * @returns configured Express app (caller decides whether to listen)
 */
export function createApp(options: AppOptions): Express {
  const app = express();
  app.disable('x-powered-by');

  app.use(helmet());
  app.use(cors({ origin: env.CORS_ORIGIN }));
  app.use(express.json({ limit: '10kb' }));

  const limiters = createRateLimiters(options.rateLimit);
  app.use('/api', limiters.general);

  const activityRepo = new ActivityRepo(options.db);
  const goalRepo = new GoalRepo(options.db);

  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok' });
  });
  app.use('/api/activities', activitiesRouter(activityRepo, limiters.write));
  app.use('/api/summary', summaryRouter(activityRepo));
  app.use('/api/insights', insightsRouter(activityRepo));
  app.use('/api/goals', goalsRouter(goalRepo, activityRepo, limiters.write));

  app.use(notFoundHandler);
  app.use(errorHandler);
  return app;
}
