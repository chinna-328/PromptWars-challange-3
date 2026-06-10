import type {
  ActivityInput,
  ActivityListResponse,
  ActivityRecord,
  ApiErrorBody,
  GoalStatus,
  Insight,
  Summary,
} from '@shared/types';
import type { Period } from '@shared/dates';

/** Error thrown for non-2xx API responses, carrying the server's code. */
export class ApiError extends Error {
  readonly code: string;

  constructor(code: string, message: string) {
    super(message);
    this.name = 'ApiError';
    this.code = code;
  }
}

/**
 * Minimal typed fetch wrapper. Parses the standard error envelope so UI
 * code can show the server's safe message without touching fetch details.
 *
 * @param path - API path starting with /api
 * @param init - optional fetch init (method, body)
 * @returns parsed JSON response
 * @throws ApiError on any non-2xx response
 */
async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(path, {
    headers: { 'Content-Type': 'application/json' },
    ...init,
  });
  if (!response.ok) {
    const fallback: ApiErrorBody = {
      error: { code: 'UNKNOWN', message: 'Something went wrong' },
    };
    const body = (await response.json().catch(() => fallback)) as ApiErrorBody;
    throw new ApiError(body.error.code, body.error.message);
  }
  if (response.status === 204) return undefined as T;
  return (await response.json()) as T;
}

/** Typed client for every EcoTrace API endpoint. */
export const api = {
  /** Creates an activity; the server computes and returns emissions. */
  createActivity(input: ActivityInput): Promise<ActivityRecord> {
    return request('/api/activities', { method: 'POST', body: JSON.stringify(input) });
  },

  /** Lists recent activities, newest first. */
  listActivities(limit = 20, signal?: AbortSignal): Promise<ActivityListResponse> {
    return request(`/api/activities?limit=${limit}`, signal ? { signal } : undefined);
  },

  /** Fully updates an activity; emissions are recomputed server-side. */
  updateActivity(id: number, input: ActivityInput): Promise<ActivityRecord> {
    return request(`/api/activities/${id}`, { method: 'PUT', body: JSON.stringify(input) });
  },

  /** Deletes an activity. */
  deleteActivity(id: number): Promise<void> {
    return request(`/api/activities/${id}`, { method: 'DELETE' });
  },

  /** Fetches dashboard totals, breakdown and trend for a period. */
  getSummary(period: Period, signal?: AbortSignal): Promise<Summary> {
    return request(`/api/summary?period=${period}`, signal ? { signal } : undefined);
  },

  /** Fetches ranked, quantified insights. */
  getInsights(signal?: AbortSignal): Promise<{ data: Insight[] }> {
    return request('/api/insights', signal ? { signal } : undefined);
  },

  /** Fetches the goal status (target, progress, streak). */
  getGoalStatus(signal?: AbortSignal): Promise<GoalStatus> {
    return request('/api/goals', signal ? { signal } : undefined);
  },

  /** Sets a new weekly target and returns the refreshed status. */
  setGoal(weeklyTargetKg: number): Promise<GoalStatus> {
    return request('/api/goals', { method: 'POST', body: JSON.stringify({ weeklyTargetKg }) });
  },
};
