import { describe, expect, it } from 'vitest';
import { describeChange, formatDate, formatKg } from './format';

describe('formatKg', () => {
  it('rounds to one decimal and appends the unit', () => {
    expect(formatKg(3.84)).toBe('3.8 kg CO2e');
    expect(formatKg(0)).toBe('0.0 kg CO2e');
    expect(formatKg(26.45)).toBe('26.5 kg CO2e');
  });
});

describe('describeChange', () => {
  it('describes an increase with the arrow duplicated in text', () => {
    const change = describeChange(12.5);
    expect(change.direction).toBe('up');
    expect(change.text).toBe('up 12.5% vs previous period');
  });

  it('describes a decrease as positive progress text', () => {
    const change = describeChange(-8);
    expect(change.direction).toBe('down');
    expect(change.text).toBe('down 8% vs previous period');
  });

  it('handles zero and missing previous data', () => {
    expect(describeChange(0).text).toBe('unchanged vs previous period');
    expect(describeChange(null).text).toBe('no previous data to compare');
  });
});

describe('formatDate', () => {
  it('formats ISO dates for humans', () => {
    expect(formatDate('2026-06-10')).toBe('10 Jun 2026');
    expect(formatDate('2026-01-01')).toBe('1 Jan 2026');
  });
});
