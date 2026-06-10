import type { RequestHandler } from 'express';
import type { ZodTypeAny } from 'zod';
import { validationError } from '../lib/AppError';

/** Request part a schema validates. */
export type ValidationSource = 'body' | 'query' | 'params';

/**
 * Builds middleware that validates one part of the request with a zod
 * schema. On success the parsed (typed, coerced) value is stored on
 * `res.locals[source]`; on failure a 400 with the first issue's message is
 * forwarded to the errorHandler. Every route validates its input through
 * this middleware before any logic runs.
 *
 * @param schema - zod schema to apply
 * @param source - which request part to validate (default 'body')
 * @returns Express middleware
 */
export function validate(schema: ZodTypeAny, source: ValidationSource = 'body'): RequestHandler {
  return (req, res, next) => {
    const result = schema.safeParse(req[source]);
    if (!result.success) {
      const issue = result.error.issues[0];
      const path = issue?.path.join('.');
      const message = issue
        ? path
          ? `${path}: ${issue.message}`
          : issue.message
        : 'Invalid input';
      next(validationError(message));
      return;
    }
    res.locals[source] = result.data;
    next();
  };
}

/**
 * Reads a value previously parsed by {@link validate}.
 * @param locals - `res.locals` of the current request
 * @param source - which request part was validated
 * @returns the parsed value, typed by the caller
 */
export function parsed<T>(locals: Record<string, unknown>, source: ValidationSource): T {
  return locals[source] as T;
}
