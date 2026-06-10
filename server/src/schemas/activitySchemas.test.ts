import { describe, expect, it } from 'vitest';
import {
  activityInputSchema,
  idParamSchema,
  listActivitiesQuerySchema,
  summaryQuerySchema,
} from './activitySchemas';
import { goalInputSchema } from './goalSchemas';
import { addDays, todayISO } from '../../../shared/dates';

const valid = {
  category: 'transport',
  activityType: 'car_petrol',
  quantity: 12,
  date: todayISO(),
};

describe('activityInputSchema', () => {
  it('accepts a valid payload, with and without a note', () => {
    expect(activityInputSchema.safeParse(valid).success).toBe(true);
    expect(activityInputSchema.safeParse({ ...valid, note: 'commute' }).success).toBe(true);
  });

  it('rejects a zero or negative quantity', () => {
    expect(activityInputSchema.safeParse({ ...valid, quantity: 0 }).success).toBe(false);
    expect(activityInputSchema.safeParse({ ...valid, quantity: -3 }).success).toBe(false);
  });

  it('rejects quantities above the per-activity cap', () => {
    expect(activityInputSchema.safeParse({ ...valid, quantity: 2001 }).success).toBe(false);
  });

  it('rejects an activityType that does not belong to the category', () => {
    const result = activityInputSchema.safeParse({ ...valid, activityType: 'meal_vegan' });
    expect(result.success).toBe(false);
  });

  it('rejects unknown categories and activity types', () => {
    expect(activityInputSchema.safeParse({ ...valid, category: 'aviation' }).success).toBe(false);
    expect(activityInputSchema.safeParse({ ...valid, activityType: 'rocket' }).success).toBe(false);
  });

  it('rejects future dates and impossible calendar dates', () => {
    expect(activityInputSchema.safeParse({ ...valid, date: addDays(todayISO(), 2) }).success).toBe(
      false,
    );
    expect(activityInputSchema.safeParse({ ...valid, date: '2026-02-30' }).success).toBe(false);
    expect(activityInputSchema.safeParse({ ...valid, date: '10/06/2026' }).success).toBe(false);
  });

  it('tolerates one day of clock skew (client timezone ahead of the server)', () => {
    expect(activityInputSchema.safeParse({ ...valid, date: addDays(todayISO(), 1) }).success).toBe(
      true,
    );
  });

  it('rejects notes longer than 200 characters', () => {
    expect(activityInputSchema.safeParse({ ...valid, note: 'x'.repeat(201) }).success).toBe(false);
  });

  it('rejects unknown extra fields (strict) — including client-sent emissions', () => {
    expect(activityInputSchema.safeParse({ ...valid, emissionsKg: 0.0001 }).success).toBe(false);
  });

  it('rejects non-numeric quantity', () => {
    expect(activityInputSchema.safeParse({ ...valid, quantity: '12' }).success).toBe(false);
  });
});

describe('listActivitiesQuerySchema', () => {
  it('applies defaults and coerces page/limit from query strings', () => {
    const parsed = listActivitiesQuerySchema.parse({});
    expect(parsed).toMatchObject({ page: 1, limit: 50 });
    expect(listActivitiesQuerySchema.parse({ page: '2', limit: '10' })).toMatchObject({
      page: 2,
      limit: 10,
    });
  });

  it('caps limit at 100 and rejects non-positive pages', () => {
    expect(listActivitiesQuerySchema.safeParse({ limit: '101' }).success).toBe(false);
    expect(listActivitiesQuerySchema.safeParse({ page: '0' }).success).toBe(false);
  });

  it('rejects an inverted date range', () => {
    expect(
      listActivitiesQuerySchema.safeParse({ from: '2026-06-10', to: '2026-06-01' }).success,
    ).toBe(false);
  });
});

describe('idParamSchema', () => {
  it('coerces numeric ids and rejects non-numeric or negative ones', () => {
    expect(idParamSchema.parse({ id: '7' })).toEqual({ id: 7 });
    expect(idParamSchema.safeParse({ id: 'abc' }).success).toBe(false);
    expect(idParamSchema.safeParse({ id: '-1' }).success).toBe(false);
  });
});

describe('summaryQuerySchema', () => {
  it('defaults to week and rejects unknown periods', () => {
    expect(summaryQuerySchema.parse({})).toEqual({ period: 'week' });
    expect(summaryQuerySchema.safeParse({ period: 'year' }).success).toBe(false);
  });
});

describe('goalInputSchema', () => {
  it('accepts a positive weekly target and rejects zero/negative/huge ones', () => {
    expect(goalInputSchema.safeParse({ weeklyTargetKg: 45 }).success).toBe(true);
    expect(goalInputSchema.safeParse({ weeklyTargetKg: 0 }).success).toBe(false);
    expect(goalInputSchema.safeParse({ weeklyTargetKg: -2 }).success).toBe(false);
    expect(goalInputSchema.safeParse({ weeklyTargetKg: 999999 }).success).toBe(false);
  });
});
