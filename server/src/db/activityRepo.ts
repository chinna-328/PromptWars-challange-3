import type { Database, Statement } from 'better-sqlite3';
import type { ActivityRecord } from '../../../shared/types';
import type { Category } from '../../../shared/emissionFactors';
import type { DateRange } from '../../../shared/dates';
import {
  toRecord,
  type ActivityRow,
  type ActivityWriteModel,
  type ListOptions,
  type TypeAggregateRow,
} from './activityRows';

export type { ActivityWriteModel, ListOptions, TypeAggregateRow } from './activityRows';

/**
 * Data access for the `activities` table. Every query is a prepared
 * statement compiled once in the constructor and reused — no SQL is ever
 * built from string concatenation (see SECURITY.md).
 * PERF: statements are prepared once at construction (app lifetime), never
 * per request; all aggregates run as SQL SUM/GROUP BY over the covering
 * index — row data is never fetched to reduce in JS.
 */
export class ActivityRepo {
  private readonly insertStmt: Statement;
  private readonly updateStmt: Statement;
  private readonly deleteStmt: Statement;
  private readonly byIdStmt: Statement;
  private readonly listStmt: Statement;
  private readonly countStmt: Statement;
  private readonly sumStmt: Statement;
  private readonly sumByCategoryStmt: Statement;
  private readonly sumByWeekStmt: Statement;
  private readonly statsByTypeStmt: Statement;
  private readonly recentDatesStmt: Statement;

  constructor(db: Database) {
    this.insertStmt = db.prepare(
      `INSERT INTO activities (category, activity_type, quantity, emissions_kg, date, note)
       VALUES (@category, @activityType, @quantity, @emissionsKg, @date, @note)`,
    );
    this.updateStmt = db.prepare(
      `UPDATE activities
       SET category = @category, activity_type = @activityType, quantity = @quantity,
           emissions_kg = @emissionsKg, date = @date, note = @note
       WHERE id = @id`,
    );
    this.deleteStmt = db.prepare('DELETE FROM activities WHERE id = ?');
    this.byIdStmt = db.prepare('SELECT * FROM activities WHERE id = ?');
    this.listStmt = db.prepare(
      `SELECT * FROM activities WHERE date BETWEEN ? AND ?
       ORDER BY date DESC, id DESC LIMIT ? OFFSET ?`,
    );
    this.countStmt = db.prepare(
      'SELECT COUNT(*) AS total FROM activities WHERE date BETWEEN ? AND ?',
    );
    // Aggregations run in SQL (index-backed) — never fetch-all-then-reduce.
    this.sumStmt = db.prepare(
      'SELECT COALESCE(SUM(emissions_kg), 0) AS total FROM activities WHERE date BETWEEN ? AND ?',
    );
    this.sumByCategoryStmt = db.prepare(
      `SELECT category, COALESCE(SUM(emissions_kg), 0) AS total
       FROM activities WHERE date BETWEEN ? AND ? GROUP BY category`,
    );
    // PERF: the whole 8-week trend in ONE indexed query instead of one
    // query per week (N+1). The DATE() expression snaps each row to the
    // Monday of its week (%w: 0=Sunday…6=Saturday), matching weekRange()
    // in shared/dates.ts exactly (verified by a boundary unit test).
    this.sumByWeekStmt = db.prepare(
      `SELECT DATE(date, '-' || ((CAST(strftime('%w', date) AS INTEGER) + 6) % 7) || ' days')
         AS weekStart, COALESCE(SUM(emissions_kg), 0) AS total
       FROM activities WHERE date BETWEEN @from AND @to
       GROUP BY weekStart ORDER BY weekStart`,
    );
    // PERF: pre-aggregates a week per activity type in SQL so the insights
    // engine runs on O(activity types) rows, never O(all logged rows).
    this.statsByTypeStmt = db.prepare(
      `SELECT activity_type AS activityType, category,
              COUNT(*) AS entryCount,
              COALESCE(SUM(quantity), 0) AS totalQuantity,
              COALESCE(SUM(emissions_kg), 0) AS totalKg,
              COALESCE(SUM(CASE WHEN quantity <= @shortKm THEN quantity ELSE 0 END), 0) AS shortKm,
              COALESCE(SUM(CASE WHEN quantity <= @shortKm THEN 1 ELSE 0 END), 0) AS shortCount
       FROM activities WHERE date BETWEEN @from AND @to
       GROUP BY activity_type, category`,
    );
    this.recentDatesStmt = db.prepare(
      'SELECT DISTINCT date FROM activities ORDER BY date DESC LIMIT ?',
    );
  }

  /**
   * Inserts a new activity and returns the stored record.
   * @param input - validated activity fields with computed emissions
   * @returns the created record including its id
   */
  create(input: ActivityWriteModel): ActivityRecord {
    const result = this.insertStmt.run(input);
    const created = this.getById(Number(result.lastInsertRowid));
    if (!created) throw new Error('Insert succeeded but row not found');
    return created;
  }

  /**
   * Fetches one activity by id.
   * @param id - activity id
   * @returns the record, or undefined when it does not exist
   */
  getById(id: number): ActivityRecord | undefined {
    const row = this.byIdStmt.get(id) as ActivityRow | undefined;
    return row ? toRecord(row) : undefined;
  }

  /**
   * Replaces an activity's fields.
   * @param id - activity id
   * @param input - validated fields with recomputed emissions
   * @returns true when a row was updated
   */
  update(id: number, input: ActivityWriteModel): boolean {
    return this.updateStmt.run({ ...input, id }).changes > 0;
  }

  /**
   * Deletes an activity.
   * @param id - activity id
   * @returns true when a row was deleted
   */
  remove(id: number): boolean {
    return this.deleteStmt.run(id).changes > 0;
  }

  /**
   * Lists activities within a date range, newest first, paginated.
   * @param options - range plus limit/offset
   * @returns matching records
   */
  list(options: ListOptions): ActivityRecord[] {
    const rows = this.listStmt.all(
      options.from,
      options.to,
      options.limit,
      options.offset,
    ) as ActivityRow[];
    return rows.map(toRecord);
  }

  /**
   * Counts activities within a date range (for pagination metadata).
   * @param range - inclusive date range
   * @returns total matching rows
   */
  count(range: DateRange): number {
    const row = this.countStmt.get(range.from, range.to) as { total: number };
    return row.total;
  }

  /**
   * Sums emissions within a date range via SQL SUM.
   * @param range - inclusive date range
   * @returns total kg CO2e (0 when empty)
   */
  sumBetween(range: DateRange): number {
    const row = this.sumStmt.get(range.from, range.to) as { total: number };
    return row.total;
  }

  /**
   * Sums emissions per category within a date range via GROUP BY.
   * @param range - inclusive date range
   * @returns per-category totals for categories that have data
   */
  sumByCategory(range: DateRange): { category: Category; total: number }[] {
    return this.sumByCategoryStmt.all(range.from, range.to) as {
      category: Category;
      total: number;
    }[];
  }

  /**
   * Sums emissions per Monday-aligned week within a date range — the whole
   * trend in a single GROUP BY query.
   * @param range - inclusive date range spanning the trend window
   * @returns weekStart (Monday ISO date) → total kg, for weeks with data
   */
  sumByWeek(range: DateRange): { weekStart: string; total: number }[] {
    return this.sumByWeekStmt.all({ from: range.from, to: range.to }) as {
      weekStart: string;
      total: number;
    }[];
  }

  /**
   * Aggregates a date range per activity type in SQL (counts, quantity,
   * emissions, short-trip breakdown) for the insights engine.
   * @param range - inclusive date range
   * @param shortTripKm - cutoff for the short-trip conditional sums
   * @returns one aggregate row per activity type present in the range
   */
  statsByType(range: DateRange, shortTripKm: number): TypeAggregateRow[] {
    return this.statsByTypeStmt.all({
      from: range.from,
      to: range.to,
      shortKm: shortTripKm,
    }) as TypeAggregateRow[];
  }

  /**
   * Returns the most recent distinct activity dates (for streak math).
   * @param limit - maximum dates to return
   * @returns ISO dates, newest first
   */
  recentDates(limit: number): string[] {
    const rows = this.recentDatesStmt.all(limit) as { date: string }[];
    return rows.map((row) => row.date);
  }
}
