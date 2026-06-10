import type { ErrorRequestHandler, RequestHandler } from 'express';
import { AppError } from '../lib/AppError';
import { logger } from '../lib/logger';

/** 404 for any route that no router claimed. */
export const notFoundHandler: RequestHandler = (_req, res) => {
  res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Resource not found' } });
};

/**
 * Single error boundary for the API. Operational AppErrors map to their
 * status and safe message; everything else (including body-parser errors)
 * is logged in full server-side and answered with a generic message so no
 * stack traces or internals ever leak to clients.
 */
export const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  if (err instanceof AppError) {
    res.status(err.statusCode).json({ error: { code: err.code, message: err.message } });
    return;
  }
  // express.json() signals oversized/malformed bodies via err.status/type.
  const status = typeof err?.status === 'number' ? err.status : undefined;
  if (status === 413) {
    res
      .status(413)
      .json({ error: { code: 'PAYLOAD_TOO_LARGE', message: 'Request body too large' } });
    return;
  }
  if (status === 400) {
    res.status(400).json({ error: { code: 'BAD_REQUEST', message: 'Malformed request body' } });
    return;
  }
  logger.error('Unhandled error', err);
  res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Something went wrong' } });
};
