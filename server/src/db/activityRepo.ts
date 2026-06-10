import type { Database, Statement } from 'better-sqlite3';
import type { ActivityRecord } from '../../../shared/types';
import type { ActivityType, Category } from '../../../shared/emissionFactors';
import type { DateRange } from '../../../shared/dates';

/** Raw row shape as stored in SQLite (snake_case columns). */
interface ActivityRow {
  id: number;
  category: Category;
  activity_type: ActivityType;
  quantity: number;
  emissions_kg: number;
  date: string;
  note: string | null;
  created_at: string;
}

/** Fields persisted for a new/updated activity (emissions pre-computed). */
export interface ActivityWriteModel {
  category: Category;
  activityType: ActivityType;
  quantity: number;
  emissionsKg: number;
  date: string;
  note: string | null;
}

/** Options for the paginated list query. */
export interface ListOptions {
  from: string;
  to: string;
  limit: number;
  offset: number;
}

const toRecord = (row: ActivityRow): ActivityRecord => ({
  id: row.id,
  category: row.category,
  activityType: row.activity_type,
  quantity: row.quantity,
  emissionsKg: row.emissions_kg,
  date: row.date,
  note: row.note,
  createdAt: row.created_at,
});

/**
 * Data access for the `activities` table. Every query is a prepared
 * statement compiled once in the constructor and reused — no SQL is ever
 * built from string concatenation (see SECURITY.md).
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
   * Returns the most recent distinct activity dates (for streak math).
   * @param limit - maximum dates to return
   * @returns ISO dates, newest first
   */
  recentDates(limit: number): string[] {
    const rows = this.recentDatesStmt.all(limit) as { date: string }[];
    return rows.map((row) => row.date);
  }
}
