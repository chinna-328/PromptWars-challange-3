import { useCallback, useEffect, useState } from 'react';

/** State exposed by {@link useAsync}. */
export interface AsyncState<T> {
  data: T | null;
  error: string | null;
  loading: boolean;
  /** Re-runs the fetch (e.g. after a mutation). */
  reload: () => void;
}

/**
 * Runs an async loader on mount and whenever `deps` change.
 * PERF: each run gets an AbortSignal that is aborted on unmount or when
 * deps change — in-flight requests are cancelled instead of completing as
 * wasted work, which also eliminates stale-response races (a slow earlier
 * request can never overwrite a newer one).
 *
 * @param loader - async function producing the data; receives the signal
 * @param deps - dependency list that re-triggers the load
 * @returns data / error / loading plus reload()
 */
export function useAsync<T>(
  loader: (signal: AbortSignal) => Promise<T>,
  deps: readonly unknown[],
): AsyncState<T> {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [version, setVersion] = useState(0);

  const reload = useCallback(() => setVersion((v) => v + 1), []);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError(null);
    loader(controller.signal)
      .then((result) => {
        if (!controller.signal.aborted) setData(result);
      })
      .catch((err: unknown) => {
        if (controller.signal.aborted) return; // cancelled, not a failure
        setError(err instanceof Error ? err.message : 'Something went wrong');
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
    // deps are caller-controlled; version re-triggers after mutations
  }, [...deps, version]);

  return { data, error, loading, reload };
}
