import { EMISSION_FACTORS, type ActivityType } from './emissionFactors';

/**
 * Calculates the emissions for a logged activity at full precision.
 * Pure function — the single calculation path used by the server (the
 * client only uses it for previews; the server value is authoritative).
 *
 * @param activityType - one of the supported activity type ids
 * @param quantity - amount in the activity's unit (km, kWh, servings, …)
 * @returns emissions in kg CO2e, full precision (round only for display)
 * @throws RangeError when quantity is not a positive finite number or
 *   exceeds the per-entry cap for the activity
 */
export function calculateEmissions(activityType: ActivityType, quantity: number): number {
  const factor = EMISSION_FACTORS[activityType];
  if (!Number.isFinite(quantity)) {
    throw new RangeError('Quantity must be a finite number');
  }
  if (quantity <= 0) {
    throw new RangeError('Quantity must be greater than zero');
  }
  if (quantity > factor.maxQuantity) {
    throw new RangeError(
      `Quantity exceeds the maximum of ${factor.maxQuantity} ${factor.unit} per entry`,
    );
  }
  return quantity * factor.kgCo2ePerUnit;
}

/**
 * Rounds a kg CO2e value to one decimal for display.
 * Storage always keeps full precision (see SPEC.md emission model).
 * @param value - kg CO2e at full precision
 * @returns value rounded to 1 decimal place
 */
export function roundKg(value: number): number {
  return Math.round(value * 10) / 10;
}
