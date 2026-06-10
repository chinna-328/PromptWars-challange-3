/**
 * SQLite schema. Executed idempotently on startup (CREATE IF NOT EXISTS).
 * `emissions_kg` is always computed server-side from the shared emission
 * factors — client-supplied values are never trusted (see SECURITY.md).
 */
export const SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS activities (
  id INTEGER PRIMARY KEY,
  category TEXT NOT NULL CHECK (category IN ('transport', 'energy', 'food', 'shopping')),
  activity_type TEXT NOT NULL,
  quantity REAL NOT NULL CHECK (quantity > 0),
  emissions_kg REAL NOT NULL CHECK (emissions_kg >= 0),
  date TEXT NOT NULL,
  note TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- PERF: covering composite index. Every summary/trend/insight query filters
-- on a date range and aggregates emissions_kg (often grouped by category),
-- so including all three columns lets SQLite answer aggregates entirely
-- from the index ("USING COVERING INDEX" — verified in PERFORMANCE.md)
-- with zero table row lookups.
DROP INDEX IF EXISTS idx_activities_date; -- superseded by the covering index
CREATE INDEX IF NOT EXISTS idx_activities_date_category
  ON activities (date, category, emissions_kg);

CREATE TABLE IF NOT EXISTS goals (
  id INTEGER PRIMARY KEY,
  weekly_target_kg REAL NOT NULL CHECK (weekly_target_kg > 0),
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
`;
