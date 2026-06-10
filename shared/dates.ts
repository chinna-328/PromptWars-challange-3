/**
 * Pure date helpers operating on ISO `yyyy-mm-dd` strings.
 * All functions take explicit inputs (no hidden "now") so they are
 * deterministic and fully unit-testable. Internally dates are handled in
 * UTC to avoid timezone-dependent behaviour.
 */

/** Inclusive date range expressed as ISO `yyyy-mm-dd` strings. */
export interface DateRange {
  from: string;
  to: string;
}

/** Summary periods supported by the dashboard. */
export type Period = 'day' | 'week' | 'month';

/**
 * Formats a Date as an ISO `yyyy-mm-dd` string (UTC).
 * @param date - date to format
 * @returns ISO date string
 */
export function toISODate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

/**
 * Parses an ISO `yyyy-mm-dd` string into a UTC Date at midnight.
 * @param iso - ISO date string
 * @returns Date at 00:00 UTC of that day
 */
export function parseISODate(iso: string): Date {
  const [year, month, day] = iso.split('-').map(Number);
  return new Date(Date.UTC(year ?? 0, (month ?? 1) - 1, day ?? 1));
}

/**
 * Returns true when `iso` is a real calendar date in `yyyy-mm-dd` form
 * (rejects e.g. 2026-02-30, which Date would silently roll over).
 * @param iso - candidate date string
 * @returns whether the string is a valid calendar date
 */
export function isValidISODate(iso: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) return false;
  return toISODate(parseISODate(iso)) === iso;
}

/**
 * Adds (or subtracts) whole days to an ISO date string.
 * @param iso - starting date
 * @param days - days to add; negative subtracts
 * @returns resulting ISO date string
 */
export function addDays(iso: string, days: number): string {
  const date = parseISODate(iso);
  date.setUTCDate(date.getUTCDate() + days);
  return toISODate(date);
}

/**
 * Returns today's ISO date for a given clock (injectable for tests).
 * @param now - current time, defaults to the system clock
 * @returns today's ISO date string
 */
export function todayISO(now: Date = new Date()): string {
  return toISODate(now);
}

/**
 * Returns true when `iso` is strictly after `today`.
 * @param iso - date under test
 * @param today - reference "today" ISO date
 * @returns whether the date lies in the future
 */
export function isFutureDate(iso: string, today: string): boolean {
  return iso > today;
}

/**
 * Returns the Monday-to-Sunday week containing `today`.
 * @param today - ISO date inside the desired week
 * @returns inclusive week range
 */
export function weekRange(today: string): DateRange {
  const date = parseISODate(today);
  // getUTCDay(): 0 = Sunday … 6 = Saturday; shift so Monday is day 0.
  const mondayOffset = (date.getUTCDay() + 6) % 7;
  const from = addDays(today, -mondayOffset);
  return { from, to: addDays(from, 6) };
}

/**
 * Returns the calendar month containing `today`.
 * @param today - ISO date inside the desired month
 * @returns inclusive month range
 */
export function monthRange(today: string): DateRange {
  const date = parseISODate(today);
  const from = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1));
  const to = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 0));
  return { from: toISODate(from), to: toISODate(to) };
}

/**
 * Returns the range for a dashboard period containing `today`.
 * @param period - 'day' | 'week' | 'month'
 * @param today - reference ISO date
 * @returns inclusive range for the period
 */
export function rangeForPeriod(period: Period, today: string): DateRange {
  if (period === 'day') return { from: today, to: today };
  if (period === 'week') return weekRange(today);
  return monthRange(today);
}

/**
 * Returns the equivalent previous period for comparison
 * (yesterday, last week, or the previous calendar month).
 * @param period - period kind the range was built for
 * @param range - current period range
 * @returns inclusive range immediately before `range`
 */
export function previousRange(period: Period, range: DateRange): DateRange {
  const prevTo = addDays(range.from, -1);
  if (period === 'month') return monthRange(prevTo);
  if (period === 'week') return weekRange(prevTo);
  return { from: prevTo, to: prevTo };
}

/**
 * Returns the last `count` Monday-aligned weeks ending with the week
 * containing `today`, ordered oldest → newest (for the trend chart).
 * @param today - reference ISO date
 * @param count - number of weeks to return
 * @returns array of inclusive week ranges
 */
export function lastNWeeks(today: string, count: number): DateRange[] {
  const current = weekRange(today);
  const weeks: DateRange[] = [];
  for (let i = count - 1; i >= 0; i -= 1) {
    const from = addDays(current.from, -7 * i);
    weeks.push({ from, to: addDays(from, 6) });
  }
  return weeks;
}
