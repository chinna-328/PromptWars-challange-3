import { z } from 'zod';
import {
  ACTIVITY_TYPES,
  CATEGORIES,
  EMISSION_FACTORS,
  type ActivityType,
} from '../../../shared/emissionFactors';
import { isFutureDate, isValidISODate, todayISO } from '../../../shared/dates';

/** ISO yyyy-mm-dd string that must be a real, non-future calendar date. */
const isoDateSchema = z
  .string()
  .refine(isValidISODate, { message: 'Date must be a valid yyyy-mm-dd date' })
  .refine((value) => !isFutureDate(value, todayISO()), {
    message: 'Date cannot be in the future',
  });

/**
 * Body schema for creating or fully updating an activity. Enforces:
 * category/activityType consistency, positive quantity within the
 * per-activity cap, valid non-future date, bounded note length.
 * Emissions are intentionally NOT accepted — they are computed server-side.
 */
export const activityInputSchema = z
  .object({
    category: z.enum(CATEGORIES),
    activityType: z.enum(ACTIVITY_TYPES as [ActivityType, ...ActivityType[]]),
    quantity: z.number().finite().positive({ message: 'Quantity must be greater than zero' }),
    date: isoDateSchema,
    note: z.string().trim().max(200, 'Note must be 200 characters or fewer').optional(),
  })
  .strict()
  .superRefine((input, ctx) => {
    const factor = EMISSION_FACTORS[input.activityType];
    if (factor.category !== input.category) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['activityType'],
        message: `Activity "${input.activityType}" does not belong to category "${input.category}"`,
      });
    }
    if (input.quantity > factor.maxQuantity) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['quantity'],
        message: `Quantity exceeds the maximum of ${factor.maxQuantity} ${factor.unit} per entry`,
      });
    }
  });

/** Parsed create/update payload. */
export type ActivityInputParsed = z.infer<typeof activityInputSchema>;

/** Query schema for listing activities: optional range, capped pagination. */
export const listActivitiesQuerySchema = z
  .object({
    from: z.string().refine(isValidISODate, 'from must be yyyy-mm-dd').optional(),
    to: z.string().refine(isValidISODate, 'to must be yyyy-mm-dd').optional(),
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(50),
  })
  .refine((query) => !query.from || !query.to || query.from <= query.to, {
    message: 'from must be on or before to',
  });

/** Parsed list query. */
export type ListActivitiesQuery = z.infer<typeof listActivitiesQuerySchema>;

/** Route param schema for /:id endpoints. */
export const idParamSchema = z.object({
  id: z.coerce.number().int().positive({ message: 'id must be a positive integer' }),
});

/** Query schema for GET /api/summary. */
export const summaryQuerySchema = z.object({
  period: z.enum(['day', 'week', 'month']).default('week'),
});
