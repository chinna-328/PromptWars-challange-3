import { describe, expect, it } from 'vitest';
import request from 'supertest';
import { activityPayload, makeTestApp } from '../helpers';
import { calculateEmissions } from '../../shared/calculateEmissions';

/**
 * End-to-end flow: log activities → dashboard totals match the shared
 * calculation exactly → insights and goal progress reflect the same data.
 */
describe('integration: log → dashboard → insights → goal', () => {
  it('keeps dashboard totals consistent with every logged activity', async () => {
    const app = makeTestApp();
    const entries = [
      { category: 'transport', activityType: 'car_petrol', quantity: 12 },
      { category: 'transport', activityType: 'metro', quantity: 8 },
      { category: 'energy', activityType: 'electricity', quantity: 6 },
      { category: 'food', activityType: 'meal_red_meat', quantity: 2 },
      { category: 'shopping', activityType: 'clothing_item', quantity: 1 },
    ] as const;

    let expectedTotal = 0;
    for (const entry of entries) {
      const res = await request(app).post('/api/activities').send(activityPayload(entry));
      expect(res.status).toBe(201);
      expectedTotal += calculateEmissions(entry.activityType, entry.quantity);
    }

    // Dashboard (day + week) must agree with the sum of server calculations.
    const day = await request(app).get('/api/summary?period=day');
    expect(day.body.totalKg).toBeCloseTo(expectedTotal, 6);
    const week = await request(app).get('/api/summary?period=week');
    expect(week.body.totalKg).toBeCloseTo(expectedTotal, 6);

    const categorySum = week.body.byCategory.reduce(
      (sum: number, row: { totalKg: number }) => sum + row.totalKg,
      0,
    );
    expect(categorySum).toBeCloseTo(expectedTotal, 6);

    // Insights are derived from the same data and stay quantified.
    const insights = await request(app).get('/api/insights');
    expect(insights.body.data.length).toBeGreaterThan(0);

    // Goal progress uses the same weekly total.
    const goal = await request(app).post('/api/goals').send({ weeklyTargetKg: 50 });
    expect(goal.body.thisWeekKg).toBeCloseTo(expectedTotal, 6);
    expect(goal.body.streakDays).toBe(1);

    // Deleting an entry is reflected in the next summary.
    const list = await request(app).get('/api/activities');
    const first = list.body.data[0];
    await request(app).delete(`/api/activities/${first.id}`);
    const after = await request(app).get('/api/summary?period=week');
    expect(after.body.totalKg).toBeCloseTo(expectedTotal - first.emissionsKg, 6);
  });
});
