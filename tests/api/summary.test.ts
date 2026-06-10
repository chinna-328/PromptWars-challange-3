import { describe, expect, it } from 'vitest';
import request from 'supertest';
import { activityPayload, makeTestApp } from '../helpers';
import { todayISO } from '../../shared/dates';

describe('GET /api/summary', () => {
  it('returns totals, breakdown and an 8-week trend for the default week period', async () => {
    const app = makeTestApp();
    await request(app)
      .post('/api/activities')
      .send(activityPayload({ quantity: 100 })); // 19.2 kg today
    await request(app)
      .post('/api/activities')
      .send(
        activityPayload({
          category: 'food',
          activityType: 'meal_red_meat',
          quantity: 1,
          date: todayISO(),
        }),
      ); // 7.2 kg today

    const res = await request(app).get('/api/summary');
    expect(res.status).toBe(200);
    expect(res.body.period).toBe('week');
    expect(res.body.totalKg).toBeCloseTo(26.4, 5);
    expect(res.body.byCategory).toHaveLength(4);
    expect(res.body.trend).toHaveLength(8);
    expect(res.body.trend[7].totalKg).toBeCloseTo(26.4, 5);
  });

  it('supports period=day and period=month', async () => {
    const app = makeTestApp();
    await request(app)
      .post('/api/activities')
      .send(activityPayload({ quantity: 10 }));
    const day = await request(app).get('/api/summary?period=day');
    expect(day.status).toBe(200);
    expect(day.body.totalKg).toBeCloseTo(1.92, 5);
    const month = await request(app).get('/api/summary?period=month');
    expect(month.body.period).toBe('month');
    expect(month.body.totalKg).toBeCloseTo(1.92, 5);
  });

  it('rejects an unknown period with 400', async () => {
    const app = makeTestApp();
    const res = await request(app).get('/api/summary?period=year');
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });
});
