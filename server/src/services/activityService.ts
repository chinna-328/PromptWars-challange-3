import { calculateEmissions } from '../../../shared/calculateEmissions';
import type { ActivityListResponse, ActivityRecord } from '../../../shared/types';
import type { ActivityRepo, ActivityWriteModel } from '../db/activityRepo';
import type { ActivityInputParsed, ListActivitiesQuery } from '../schemas/activitySchemas';
import { notFoundError } from '../lib/AppError';

/** Widest range used when a list query omits from/to. */
const OPEN_RANGE = { from: '0000-01-01', to: '9999-12-31' };

const toWriteModel = (input: ActivityInputParsed): ActivityWriteModel => ({
  category: input.category,
  activityType: input.activityType,
  quantity: input.quantity,
  // Emissions are always computed server-side from the shared factors —
  // a client-supplied value would never be trusted (SECURITY.md).
  emissionsKg: calculateEmissions(input.activityType, input.quantity),
  date: input.date,
  note: input.note ?? null,
});

/**
 * Creates an activity, computing its emissions from the shared factors.
 * @param repo - activity repository
 * @param input - validated activity payload
 * @returns the stored record
 */
export function createActivity(repo: ActivityRepo, input: ActivityInputParsed): ActivityRecord {
  return repo.create(toWriteModel(input));
}

/**
 * Fully updates an activity, recomputing emissions.
 * @param repo - activity repository
 * @param id - activity id
 * @param input - validated activity payload
 * @returns the updated record
 * @throws AppError 404 when the activity does not exist
 */
export function updateActivity(
  repo: ActivityRepo,
  id: number,
  input: ActivityInputParsed,
): ActivityRecord {
  if (!repo.update(id, toWriteModel(input))) {
    throw notFoundError(`Activity ${id} not found`);
  }
  const updated = repo.getById(id);
  if (!updated) throw notFoundError(`Activity ${id} not found`);
  return updated;
}

/**
 * Deletes an activity.
 * @param repo - activity repository
 * @param id - activity id
 * @throws AppError 404 when the activity does not exist
 */
export function deleteActivity(repo: ActivityRepo, id: number): void {
  if (!repo.remove(id)) {
    throw notFoundError(`Activity ${id} not found`);
  }
}

/**
 * Fetches one activity.
 * @param repo - activity repository
 * @param id - activity id
 * @returns the record
 * @throws AppError 404 when the activity does not exist
 */
export function getActivity(repo: ActivityRepo, id: number): ActivityRecord {
  const record = repo.getById(id);
  if (!record) throw notFoundError(`Activity ${id} not found`);
  return record;
}

/**
 * Lists activities with pagination metadata.
 * @param repo - activity repository
 * @param query - validated list query (range, page, limit)
 * @returns records plus pagination info
 */
export function listActivities(
  repo: ActivityRepo,
  query: ListActivitiesQuery,
): ActivityListResponse {
  const range = { from: query.from ?? OPEN_RANGE.from, to: query.to ?? OPEN_RANGE.to };
  const offset = (query.page - 1) * query.limit;
  return {
    data: repo.list({ ...range, limit: query.limit, offset }),
    pagination: { page: query.page, limit: query.limit, total: repo.count(range) },
  };
}
