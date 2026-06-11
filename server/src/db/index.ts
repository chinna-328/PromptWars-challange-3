/**
 * SQLite connection factory: opens the database, applies pragmas and the
 * idempotent schema. Key invariant: every connection (file or :memory:)
 * goes through createDb so tests and production share identical setup.
 */
import fs from 'node:fs';
import path from 'node:path';
import Database from 'better-sqlite3';
import { SCHEMA_SQL } from './schema';

/**
 * Opens (creating if needed) the SQLite database and applies the schema.
 * Pass ':memory:' for an ephemeral database (used by the test suites).
 *
 * @param dbPath - file path for the database, or ':memory:'
 * @returns an open better-sqlite3 Database handle
 */
export function createDb(dbPath: string): Database.Database {
  if (dbPath !== ':memory:') {
    fs.mkdirSync(path.dirname(dbPath), { recursive: true });
  }
  const db = new Database(dbPath);
  // PERF: WAL improves concurrent read performance for a local single-user
  // app; synchronous=NORMAL is the standard WAL pairing — fsync only at
  // checkpoints, several times faster writes, still crash-safe under WAL.
  db.pragma('journal_mode = WAL');
  db.pragma('synchronous = NORMAL');
  db.pragma('foreign_keys = ON');
  db.exec(SCHEMA_SQL);
  return db;
}
