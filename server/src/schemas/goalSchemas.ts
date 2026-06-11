/**
 * Zod schemas for the goals API boundary.
 * Key invariant: targets are positive, finite and bounded before any
 * service logic runs.
 */
import { z } from 'zod';

/**
 * Body schema for POST /api/goals — a weekly emissions budget.
 * Bounded above to keep obviously nonsensical targets out of the data.
 */
export const goalInputSchema = z
  .object({
    weeklyTargetKg: z.coerce
      .number()
      .finite()
      .positive({ message: 'Weekly target must be greater than zero' })
      .max(10000, 'Weekly target must be 10000 kg or less'),
  })
  .strict();

/** Parsed goal payload. */
export type GoalInputParsed = z.infer<typeof goalInputSchema>;
