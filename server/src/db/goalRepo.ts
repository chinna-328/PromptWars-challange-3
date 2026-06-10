import type { Database, Statement } from 'better-sqlite3';

/** A stored weekly emissions goal. */
export interface GoalRow {
  id: number;
  weekly_target_kg: number;
  created_at: string;
}

/**
 * Data access for the `goals` table. The newest row is the active goal —
 * setting a new target simply inserts, preserving history.
 * Prepared statements only (see SECURITY.md).
 */
export class GoalRepo {
  private readonly insertStmt: Statement;
  private readonly latestStmt: Statement;

  constructor(db: Database) {
    this.insertStmt = db.prepare('INSERT INTO goals (weekly_target_kg) VALUES (?)');
    this.latestStmt = db.prepare('SELECT * FROM goals ORDER BY id DESC LIMIT 1');
  }

  /**
   * Stores a new weekly target, making it the active goal.
   * @param weeklyTargetKg - weekly emissions budget in kg CO2e
   */
  setTarget(weeklyTargetKg: number): void {
    this.insertStmt.run(weeklyTargetKg);
  }

  /**
   * Returns the active (most recent) goal.
   * @returns the latest goal row, or undefined when none is set
   */
  latest(): GoalRow | undefined {
    return this.latestStmt.get() as GoalRow | undefined;
  }
}
