/**
 * Tiny in-memory TTL cache for read-heavy API responses.
 * PERF: /api/summary and /api/insights are recomputed on every dashboard
 * visit but their inputs only change when an activity is written — so
 * reads are served from this cache for up to TTL_MS and the whole cache
 * is invalidated on every activity create/update/delete. Single-process,
 * single-user app → a Map is all that's needed (no Redis surface).
 */
export class TtlCache {
  private readonly store = new Map<string, { value: unknown; expiresAt: number }>();
  private readonly ttlMs: number;

  /** @param ttlMs - how long entries stay fresh, in milliseconds */
  constructor(ttlMs: number) {
    this.ttlMs = ttlMs;
  }

  /**
   * Returns the cached value for a key, or undefined when absent/expired.
   * @param key - cache key
   * @returns the cached value, if still fresh
   */
  get<T>(key: string): T | undefined {
    const entry = this.store.get(key);
    if (!entry) return undefined;
    if (Date.now() > entry.expiresAt) {
      this.store.delete(key);
      return undefined;
    }
    return entry.value as T;
  }

  /**
   * Stores a value under a key for the configured TTL.
   * @param key - cache key
   * @param value - value to cache
   */
  set(key: string, value: unknown): void {
    this.store.set(key, { value, expiresAt: Date.now() + this.ttlMs });
  }

  /** Drops every entry — called after any write to the activities table. */
  clear(): void {
    this.store.clear();
  }
}
