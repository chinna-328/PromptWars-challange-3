import { afterEach, describe, expect, it, vi } from 'vitest';
import { api, ApiError } from './api';

// A fresh Response per call — a body can only be consumed once.
const mockFetch = (body: unknown, status = 200) =>
  vi.spyOn(globalThis, 'fetch').mockImplementation(() =>
    Promise.resolve(
      status === 204
        ? new Response(null, { status })
        : new Response(JSON.stringify(body), {
            status,
            headers: { 'Content-Type': 'application/json' },
          }),
    ),
  );

afterEach(() => {
  vi.restoreAllMocks();
});

describe('api client', () => {
  it('POSTs new activities as JSON', async () => {
    const spy = mockFetch({ id: 1 }, 201);
    await api.createActivity({
      category: 'transport',
      activityType: 'bus',
      quantity: 4,
      date: '2026-06-10',
    });
    const [url, init] = spy.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('/api/activities');
    expect(init.method).toBe('POST');
    expect(JSON.parse(String(init.body))).toMatchObject({ activityType: 'bus', quantity: 4 });
  });

  it('GETs summary, insights, goals and the activity list', async () => {
    const spy = mockFetch({});
    await api.getSummary('week');
    await api.getInsights();
    await api.getGoalStatus();
    await api.listActivities(10);
    const urls = spy.mock.calls.map((call) => call[0]);
    expect(urls).toEqual([
      '/api/summary?period=week',
      '/api/insights',
      '/api/goals',
      '/api/activities?limit=10',
    ]);
  });

  it('resolves DELETE 204 to undefined', async () => {
    const spy = mockFetch(null, 204);
    await expect(api.deleteActivity(7)).resolves.toBeUndefined();
    expect(spy.mock.calls[0]?.[0]).toBe('/api/activities/7');
  });

  it('PUTs updates to the entry URL', async () => {
    const spy = mockFetch({ id: 7 });
    const updated = await api.updateActivity(7, {
      category: 'food',
      activityType: 'meal_vegan',
      quantity: 1,
      date: '2026-06-10',
    });
    expect(updated.id).toBe(7);
    expect(spy.mock.calls[0]?.[0]).toBe('/api/activities/7');
    expect((spy.mock.calls[0]?.[1] as RequestInit).method).toBe('PUT');
  });

  it('throws an ApiError carrying the server code and message', async () => {
    mockFetch({ error: { code: 'VALIDATION_ERROR', message: 'quantity: too big' } }, 400);
    await expect(api.setGoal(0)).rejects.toBeInstanceOf(ApiError);
    await expect(api.setGoal(0)).rejects.toMatchObject({
      code: 'VALIDATION_ERROR',
      message: 'quantity: too big',
    });
  });

  it('falls back to a generic error when the body is not JSON', async () => {
    vi.spyOn(globalThis, 'fetch').mockImplementation(() =>
      Promise.resolve(new Response('boom', { status: 500 })),
    );
    await expect(api.getInsights()).rejects.toMatchObject({ code: 'UNKNOWN' });
  });
});
