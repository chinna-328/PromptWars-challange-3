/**
 * Row shapes and mapping for the `activities` table — keeps the repository
 * itself focused purely on prepared statements and query methods.
 */
import type { ActivityRecord } from '../../../shared/types';
import type { ActivityType, Category } from '../../../shared/emissionFactors';

/** Raw row shape as stored in SQLite (snake_case columns). */
export interface ActivityRow {
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

/** One row of per-activity-type aggregates (see ActivityRepo.statsByType). */
export interface TypeAggregateRow {
  activityType: ActivityType;
  category: Category;
  entryCount: number;
  totalQuantity: number;
  totalKg: number;
  /** km/quantity and count of entries at or below the short-trip cutoff. */
  shortKm: number;
  shortCount: number;
}

/**
 * Maps a snake_case SQLite row to the camelCase API record.
 * @param row - raw database row
 * @returns the API-facing activity record
 */
export const toRecord = (row: ActivityRow): ActivityRecord => ({
  id: row.id,
  category: row.category,
  activityType: row.activity_type,
  quantity: row.quantity,
  emissionsKg: row.emissions_kg,
  date: row.date,
  note: row.note,
  createdAt: row.created_at,
});
