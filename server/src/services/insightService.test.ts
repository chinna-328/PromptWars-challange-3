import { describe, expect, it } from 'vitest';
import { computeInsights } from './insightService';
import { record } from '../../../tests/helpers';

const ids = (input: Parameters<typeof computeInsights>[0]): string[] =>
  computeInsights(input).map((insight) => insight.id);

describe('computeInsights — rule engine', () => {
  it('suggests shifting car km to transit when transport dominates and car-km > 30', () => {
    const thisWeek = [record('car_petrol', 50)];
    const insights = computeInsights({ thisWeek, lastWeekKg: 0 });
    const insight = insights.find((i) => i.id === 'swap-car-for-transit');
    expect(insight).toBeDefined();
    // 20 km × (0.192 − 0.031) = 3.22 → 3.2 rounded
    expect(insight?.estimatedWeeklySavingKg).toBeCloseTo(3.2, 5);
    expect(insight?.body).toMatch(/metro/i);
  });

  it('does not suggest transit when car-km is at or below 30', () => {
    expect(ids({ thisWeek: [record('car_petrol', 30)], lastWeekKg: 0 })).not.toContain(
      'swap-car-for-transit',
    );
  });

  it('suggests cycling when three or more short car trips are logged', () => {
    const thisWeek = [record('car_petrol', 3), record('car_petrol', 4), record('car_diesel', 5)];
    const insights = computeInsights({ thisWeek, lastWeekKg: 0 });
    const insight = insights.find((i) => i.id === 'cycle-short-trips');
    // 12 km × 0.192 = 2.304 → 2.3
    expect(insight?.estimatedWeeklySavingKg).toBeCloseTo(2.3, 5);
  });

  it('suggests swapping red meat when 4+ red-meat meals are logged', () => {
    const thisWeek = [record('meal_red_meat', 4)];
    const insight = computeInsights({ thisWeek, lastWeekKg: 0 }).find(
      (i) => i.id === 'swap-red-meat',
    );
    // 2 swaps × (7.2 − 1.2) = 12.0
    expect(insight?.estimatedWeeklySavingKg).toBe(12);
  });

  it('suggests trimming electricity above 35 kWh/week with a 10% saving', () => {
    const thisWeek = [record('electricity', 50)];
    const insight = computeInsights({ thisWeek, lastWeekKg: 0 }).find(
      (i) => i.id === 'trim-electricity',
    );
    // 50 × 0.1 × 0.82 = 4.1
    expect(insight?.estimatedWeeklySavingKg).toBeCloseTo(4.1, 5);
  });

  it('suggests trains over short-haul flights with the per-km delta', () => {
    const thisWeek = [record('flight_short', 1000)];
    const insight = computeInsights({ thisWeek, lastWeekKg: 0 }).find(
      (i) => i.id === 'train-not-plane',
    );
    // 1000 × (0.255 − 0.041) = 214
    expect(insight?.estimatedWeeklySavingKg).toBeCloseTo(214, 5);
  });

  it('suggests second-hand shopping above 20 kg CO2e of purchases', () => {
    const thisWeek = [record('electronics_small', 1)]; // 70 kg
    const insight = computeInsights({ thisWeek, lastWeekKg: 0 }).find(
      (i) => i.id === 'buy-less-new',
    );
    expect(insight?.estimatedWeeklySavingKg).toBeCloseTo(21, 5);
  });

  it('suggests efficient cooking above 5 kg LPG/week', () => {
    const thisWeek = [record('lpg', 10)];
    const insight = computeInsights({ thisWeek, lastWeekKg: 0 }).find(
      (i) => i.id === 'efficient-cooking',
    );
    // 10 × 2.98 × 0.15 = 4.47 → 4.5
    expect(insight?.estimatedWeeklySavingKg).toBeCloseTo(4.5, 5);
  });

  it('nudges a first green trip when driving without any bike/walk logs', () => {
    const thisWeek = [record('car_petrol', 10)];
    expect(ids({ thisWeek, lastWeekKg: 0 })).toContain('start-green-trips');
  });

  it('skips the green-trip nudge once a bike or walk trip exists', () => {
    const thisWeek = [record('car_petrol', 10), record('bicycle', 3)];
    expect(ids({ thisWeek, lastWeekKg: 0 })).not.toContain('start-green-trips');
  });

  it('praises progress when this week is below last week, quantifying the drop', () => {
    const thisWeek = [record('bus', 10)]; // 1.05 kg
    const insight = computeInsights({ thisWeek, lastWeekKg: 11.05 }).find(
      (i) => i.id === 'progress-praise',
    );
    expect(insight?.estimatedWeeklySavingKg).toBeCloseTo(10, 5);
  });

  it('flags a rising footprint and targets the top category', () => {
    const thisWeek = [record('meal_red_meat', 3)]; // 21.6 kg, food
    const insight = computeInsights({ thisWeek, lastWeekKg: 10 }).find(
      (i) => i.id === 'rising-footprint',
    );
    expect(insight?.category).toBe('food');
    // 21.6 × 0.1 = 2.16 → 2.2
    expect(insight?.estimatedWeeklySavingKg).toBeCloseTo(2.2, 5);
  });

  it('returns a starter insight for an empty week', () => {
    const insights = computeInsights({ thisWeek: [], lastWeekKg: 0 });
    expect(insights).toHaveLength(1);
    expect(insights[0]?.id).toBe('first-steps');
  });

  it('ranks insights by estimated weekly saving, largest first', () => {
    const thisWeek = [
      record('flight_short', 1000), // train-not-plane ≈ 214
      record('meal_red_meat', 4), // swap-red-meat = 12
      record('electricity', 50), // trim-electricity ≈ 4.1
    ];
    const insights = computeInsights({ thisWeek, lastWeekKg: 0 });
    const savings = insights.map((i) => i.estimatedWeeklySavingKg);
    expect([...savings].sort((a, b) => b - a)).toEqual(savings);
    expect(insights[0]?.id).toBe('train-not-plane');
  });

  it('always quantifies: every insight body and saving is specific', () => {
    const thisWeek = [record('car_petrol', 50), record('meal_red_meat', 5)];
    for (const insight of computeInsights({ thisWeek, lastWeekKg: 100 })) {
      expect(insight.title.length).toBeGreaterThan(0);
      expect(insight.body).toMatch(/\d/); // contains a number
      expect(insight.estimatedWeeklySavingKg).toBeGreaterThanOrEqual(0);
    }
  });
});
