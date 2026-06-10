import { describe, expect, it } from 'vitest';
import { calculateEmissions, roundKg } from './calculateEmissions';
import { ACTIVITY_TYPES, EMISSION_FACTORS } from './emissionFactors';

describe('calculateEmissions', () => {
  it.each([
    ['car_petrol', 5, 0.96],
    ['car_diesel', 10, 1.71],
    ['car_ev', 100, 5.3],
    ['bus', 10, 1.05],
    ['train', 100, 4.1],
    ['metro', 12, 0.372],
    ['flight_short', 1000, 255],
    ['flight_long', 8000, 1560],
    ['electricity', 3, 2.46],
    ['lpg', 2, 5.96],
    ['meal_red_meat', 2, 14.4],
    ['meal_poultry', 1, 1.9],
    ['meal_fish', 1, 1.7],
    ['meal_vegetarian', 3, 3.6],
    ['meal_vegan', 2, 1.8],
    ['clothing_item', 2, 20],
    ['electronics_small', 1, 70],
    ['electronics_large', 1, 250],
    ['misc_item', 4, 6],
  ] as const)('computes %s × %d → %d kg CO2e', (type, quantity, expected) => {
    expect(calculateEmissions(type, quantity)).toBeCloseTo(expected, 6);
  });

  it('returns exactly zero for zero-emission green activities (bicycle, walk)', () => {
    expect(calculateEmissions('bicycle', 12)).toBe(0);
    expect(calculateEmissions('walk', 3)).toBe(0);
  });

  it('rejects a quantity of zero', () => {
    expect(() => calculateEmissions('car_petrol', 0)).toThrow(RangeError);
  });

  it('rejects negative quantities', () => {
    expect(() => calculateEmissions('electricity', -5)).toThrow(/greater than zero/);
  });

  it('rejects NaN and infinite quantities', () => {
    expect(() => calculateEmissions('bus', Number.NaN)).toThrow(/finite/);
    expect(() => calculateEmissions('bus', Number.POSITIVE_INFINITY)).toThrow(/finite/);
  });

  it('rejects quantities above the per-entry cap for every activity type', () => {
    for (const type of ACTIVITY_TYPES) {
      const cap = EMISSION_FACTORS[type].maxQuantity;
      expect(() => calculateEmissions(type, cap + 1)).toThrow(RangeError);
      // The cap itself is still a legal entry.
      expect(() => calculateEmissions(type, cap)).not.toThrow();
    }
  });

  it('returns full precision (rounding is display-only)', () => {
    // 7 km by petrol car = 1.344 kg — must not be pre-rounded to 1.3.
    expect(calculateEmissions('car_petrol', 7)).toBeCloseTo(1.344, 10);
  });
});

describe('roundKg', () => {
  it('rounds to one decimal place', () => {
    expect(roundKg(1.344)).toBe(1.3);
    expect(roundKg(1.35)).toBe(1.4);
    expect(roundKg(0.04)).toBe(0);
  });

  it('keeps whole numbers untouched', () => {
    expect(roundKg(250)).toBe(250);
    expect(roundKg(0)).toBe(0);
  });
});
