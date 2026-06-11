/**
 * Pure display formatters for emissions values and period change.
 * Key invariant: direction ("down 12% vs previous period") is always
 * spelled out in text — never conveyed by color or an arrow alone.
 */
import { roundKg } from '@shared/calculateEmissions';

/**
 * Formats a kg CO2e value for display, rounded to one decimal.
 * @param kg - value at full precision
 * @returns e.g. "3.8 kg CO2e"
 */
export function formatKg(kg: number): string {
  return `${roundKg(kg).toFixed(1)} kg CO2e`;
}

/** Direction of change vs the previous period. */
export type ChangeDirection = 'up' | 'down' | 'flat';

/** Accessible description of a period-over-period change. */
export interface ChangeDescription {
  direction: ChangeDirection;
  /** Screen-reader friendly sentence, also rendered as visible text. */
  text: string;
  /** Visual arrow; meaning is always duplicated in `text`, never color-only. */
  arrow: string;
}

/**
 * Describes a change vs the previous period in accessible text. The arrow
 * is decorative; direction and percentage are always spelled out.
 *
 * @param changePct - signed percent change, or null when undefined
 * @returns direction, arrow and human-readable text
 */
export function describeChange(changePct: number | null): ChangeDescription {
  if (changePct === null) {
    return { direction: 'flat', arrow: '•', text: 'no previous data to compare' };
  }
  if (changePct > 0) {
    return { direction: 'up', arrow: '▲', text: `up ${changePct}% vs previous period` };
  }
  if (changePct < 0) {
    return {
      direction: 'down',
      arrow: '▼',
      text: `down ${Math.abs(changePct)}% vs previous period`,
    };
  }
  return { direction: 'flat', arrow: '•', text: 'unchanged vs previous period' };
}

/**
 * Formats an ISO yyyy-mm-dd date for display (e.g. "10 Jun 2026").
 * Uses native Intl — no date library dependency.
 * @param iso - ISO date string
 * @returns localized short date
 */
export function formatDate(iso: string): string {
  const [year, month, day] = iso.split('-').map(Number);
  const date = new Date(Date.UTC(year ?? 1970, (month ?? 1) - 1, day ?? 1));
  return new Intl.DateTimeFormat('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(date);
}
