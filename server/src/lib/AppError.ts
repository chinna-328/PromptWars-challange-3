/**
 * Operational error carrying an HTTP status and a stable machine code.
 * Thrown anywhere in routes/services and translated to the
 * `{ error: { code, message } }` envelope by the errorHandler middleware.
 */
export class AppError extends Error {
  readonly statusCode: number;
  readonly code: string;

  /**
   * @param statusCode - HTTP status to respond with
   * @param code - stable machine-readable error code
   * @param message - safe, human-readable message (no internals)
   */
  constructor(statusCode: number, code: string, message: string) {
    super(message);
    this.name = 'AppError';
    this.statusCode = statusCode;
    this.code = code;
  }
}

/**
 * Convenience factory for 404 responses.
 * @param message - what was not found
 * @returns an AppError with status 404
 */
export function notFoundError(message: string): AppError {
  return new AppError(404, 'NOT_FOUND', message);
}

/**
 * Convenience factory for 400 validation responses.
 * @param message - what was invalid
 * @returns an AppError with status 400
 */
export function validationError(message: string): AppError {
  return new AppError(400, 'VALIDATION_ERROR', message);
}
