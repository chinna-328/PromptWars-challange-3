import type { ActivityType, Category } from './emissionFactors';
import type { Period } from './dates';

/** A stored activity log entry as returned by the API. */
export interface ActivityRecord {
  id: number;
  category: Category;
  activityType: ActivityType;
  /** Quantity in the activity's unit (km, kWh, servings, items, kg). */
  quantity: number;
  /** Server-computed emissions, full precision kg CO2e. */
  emissionsKg: number;
  /** ISO yyyy-mm-dd date the activity happened. */
  date: string;
  note: string | null;
  createdAt: string;
}

/** Payload for creating/updating an activity (emissions are server-side). */
export interface ActivityInput {
  category: Category;
  activityType: ActivityType;
  quantity: number;
  date: string;
  note?: string;
}

/** Paginated list response for activities. */
export interface ActivityListResponse {
  data: ActivityRecord[];
  pagination: { page: number; limit: number; total: number };
}

/** Per-category total used in the dashboard breakdown. */
export interface CategoryTotal {
  category: Category;
  totalKg: number;
}

/** One point of the 8-week trend line. */
export interface TrendPoint {
  /** Monday of the week, ISO yyyy-mm-dd. */
  weekStart: string;
  totalKg: number;
}

/** Dashboard summary returned by GET /api/summary. */
export interface Summary {
  period: Period;
  range: { from: string; to: string };
  totalKg: number;
  previousTotalKg: number;
  /** Percent change vs previous period; null when previous total is 0. */
  changePct: number | null;
  byCategory: CategoryTotal[];
  trend: TrendPoint[];
}

/** A personalised, quantified suggestion from the insights engine. */
export interface Insight {
  id: string;
  title: string;
  body: string;
  /** Estimated kg CO2e the user could save per week by acting on it. */
  estimatedWeeklySavingKg: number;
  category: Category | 'general';
}

/** Goal status returned by GET /api/goals. */
export interface GoalStatus {
  /** Weekly emissions budget in kg CO2e; null when not set yet. */
  weeklyTargetKg: number | null;
  thisWeekKg: number;
  /** Share of the weekly budget already used, 0–100 (capped). */
  budgetUsedPct: number | null;
  /** Consecutive days (ending today or yesterday) with ≥1 logged entry. */
  streakDays: number;
}

/** Error envelope used by every API error response. */
export interface ApiErrorBody {
  error: { code: string; message: string };
}
