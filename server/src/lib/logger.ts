/**
 * Minimal leveled logger — the only sanctioned wrapper around `console`
 * (the `no-console` lint rule is disabled for this file alone).
 * Detailed errors stay server-side; clients only ever see generic messages.
 */
export const logger = {
  /**
   * Logs an informational message.
   * @param message - human-readable event description
   * @param meta - optional structured context
   */
  info(message: string, meta?: unknown): void {
    if (process.env.NODE_ENV === 'test') return;
    console.info(`[info] ${message}`, meta ?? '');
  },

  /**
   * Logs an error with full detail for operators.
   * @param message - human-readable event description
   * @param error - the underlying error or context
   */
  error(message: string, error?: unknown): void {
    if (process.env.NODE_ENV === 'test') return;
    console.error(`[error] ${message}`, error ?? '');
  },
};
