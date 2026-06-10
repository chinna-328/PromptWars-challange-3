import { describe, expect, it } from 'vitest';
import {
  addDays,
  isFutureDate,
  isValidISODate,
  lastNWeeks,
  monthRange,
  previousRange,
  rangeForPeriod,
  todayISO,
  weekRange,
} from './dates';

describe('isValidISODate', () => {
  it('accepts real calendar dates', () => {
    expect(isValidISODate('2026-06-10')).toBe(true);
    expect(isValidISODate('2024-02-29')).toBe(true); // leap day
  });

  it('rejects malformed strings and impossible dates', () => {
    expect(isValidISODate('10-06-2026')).toBe(false);
    expect(isValidISODate('2026-13-01')).toBe(false);
    expect(isValidISODate('2026-02-30')).toBe(false);
    expect(isValidISODate('2023-02-29')).toBe(false); // not a leap year
  });
});

describe('addDays', () => {
  it('crosses month and year boundaries correctly', () => {
    expect(addDays('2026-01-31', 1)).toBe('2026-02-01');
    expect(addDays('2025-12-31', 1)).toBe('2026-01-01');
    expect(addDays('2026-03-01', -1)).toBe('2026-02-28');
  });
});

describe('weekRange', () => {
  it('returns Monday→Sunday for a midweek date', () => {
    // 2026-06-10 is a Wednesday.
    expect(weekRange('2026-06-10')).toEqual({ from: '2026-06-08', to: '2026-06-14' });
  });

  it('handles the week boundary: Sunday belongs to the preceding Monday', () => {
    expect(weekRange('2026-06-14')).toEqual({ from: '2026-06-08', to: '2026-06-14' });
  });

  it('handles a Monday as the start of its own week', () => {
    expect(weekRange('2026-06-08')).toEqual({ from: '2026-06-08', to: '2026-06-14' });
  });
});

describe('monthRange', () => {
  it('covers the full calendar month including leap February', () => {
    expect(monthRange('2026-06-10')).toEqual({ from: '2026-06-01', to: '2026-06-30' });
    expect(monthRange('2024-02-15')).toEqual({ from: '2024-02-01', to: '2024-02-29' });
  });
});

describe('rangeForPeriod', () => {
  it('returns a single-day range for "day"', () => {
    expect(rangeForPeriod('day', '2026-06-10')).toEqual({ from: '2026-06-10', to: '2026-06-10' });
  });

  it('delegates to week and month ranges', () => {
    expect(rangeForPeriod('week', '2026-06-10').from).toBe('2026-06-08');
    expect(rangeForPeriod('month', '2026-06-10').to).toBe('2026-06-30');
  });
});

describe('previousRange', () => {
  it('returns yesterday for a day range', () => {
    expect(previousRange('day', { from: '2026-06-10', to: '2026-06-10' })).toEqual({
      from: '2026-06-09',
      to: '2026-06-09',
    });
  });

  it('returns the previous Monday→Sunday week', () => {
    expect(previousRange('week', { from: '2026-06-08', to: '2026-06-14' })).toEqual({
      from: '2026-06-01',
      to: '2026-06-07',
    });
  });

  it('returns the previous calendar month across a year boundary', () => {
    expect(previousRange('month', { from: '2026-01-01', to: '2026-01-31' })).toEqual({
      from: '2025-12-01',
      to: '2025-12-31',
    });
  });
});

describe('lastNWeeks', () => {
  it('returns 8 contiguous weeks oldest→newest ending with the current week', () => {
    const weeks = lastNWeeks('2026-06-10', 8);
    expect(weeks).toHaveLength(8);
    expect(weeks[7]).toEqual({ from: '2026-06-08', to: '2026-06-14' });
    expect(weeks[0]).toEqual({ from: '2026-04-20', to: '2026-04-26' });
    for (let i = 1; i < weeks.length; i += 1) {
      expect(weeks[i]?.from).toBe(addDays(weeks[i - 1]?.from ?? '', 7));
    }
  });
});

describe('isFutureDate / todayISO', () => {
  it('flags only strictly future dates', () => {
    expect(isFutureDate('2026-06-11', '2026-06-10')).toBe(true);
    expect(isFutureDate('2026-06-10', '2026-06-10')).toBe(false);
    expect(isFutureDate('2026-06-09', '2026-06-10')).toBe(false);
  });

  it('formats an injected clock as yyyy-mm-dd', () => {
    expect(todayISO(new Date(Date.UTC(2026, 5, 10, 12)))).toBe('2026-06-10');
  });
});
