import { describe, expect, it } from 'vitest';
import request from 'supertest';
import { activityPayload, makeTestApp } from '../helpers';

describe('GET /api/goals', () => {
  it('returns null target and zero progress before a goal is set', async () => {
    const app = makeTestApp();
    const res = await request(app).get('/api/goals');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      weeklyTargetKg: null,
      thisWeekKg: 0,
      budgetUsedPct: null,
      streakDays: 0,
    });
  });
});

describe('POST /api/goals', () => {
  it('sets a weekly target and reports budget usage and streak', async () => {
    const app = makeTestApp();
    await request(app)
      .post('/api/activities')
      .send(activityPayload({ quantity: 100 })); // 19.2 kg today

    const res = await request(app).post('/api/goals').send({ weeklyTargetKg: 40 });
    expect(res.status).toBe(201);
    expect(res.body.weeklyTargetKg).toBe(40);
    expect(res.body.thisWeekKg).toBeCloseTo(19.2, 5);
    expect(res.body.budgetUsedPct).toBe(48);
    expect(res.body.streakDays).toBe(1);
  });

  it('replaces the active goal with the newest target', async () => {
    const app = makeTestApp();
    await request(app).post('/api/goals').send({ weeklyTargetKg: 40 });
    const res = await request(app).post('/api/goals').send({ weeklyTargetKg: 25 });
    expect(res.body.weeklyTargetKg).toBe(25);
  });

  it('rejects a non-positive target with 400', async () => {
    const app = makeTestApp();
    const res = await request(app).post('/api/goals').send({ weeklyTargetKg: 0 });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });
});

describe('GET /api/insights', () => {
  it('returns ranked, quantified insights derived from logged activity', async () => {
    const app = makeTestApp();
    await request(app)
      .post('/api/activities')
      .send(activityPayload({ category: 'food', activityType: 'meal_red_meat', quantity: 5 }));
    const res = await request(app).get('/api/insights');
    expect(res.status).toBe(200);
    const ids = res.body.data.map((insight: { id: string }) => insight.id);
    expect(ids).toContain('swap-red-meat');
    for (const insight of res.body.data) {
      expect(insight.estimatedWeeklySavingKg).toBeGreaterThanOrEqual(0);
      expect(insight.body).toMatch(/\d/);
    }
  });

  it('returns the starter insight when nothing is logged', async () => {
    const app = makeTestApp();
    const res = await request(app).get('/api/insights');
    expect(res.status).toBe(200);
    expect(res.body.data[0].id).toBe('first-steps');
  });
});
