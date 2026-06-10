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

-- Date index: every summary/trend query filters on date ranges, so
-- aggregations stay index-backed instead of scanning the table.
CREATE INDEX IF NOT EXISTS idx_activities_date ON activities (date);

CREATE TABLE IF NOT EXISTS goals (
  id INTEGER PRIMARY KEY,
  weekly_target_kg REAL NOT NULL CHECK (weekly_target_kg > 0),
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
`;
