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
 * Runs an async loader on mount and whenever `deps` change, with stale
 * response protection (a slower earlier request can never overwrite a
 * newer one) and a manual reload for after mutations.
 *
 * @param loader - async function producing the data
 * @param deps - dependency list that re-triggers the load
 * @returns data / error / loading plus reload()
 */
export function useAsync<T>(loader: () => Promise<T>, deps: readonly unknown[]): AsyncState<T> {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [version, setVersion] = useState(0);

  const reload = useCallback(() => setVersion((v) => v + 1), []);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    loader()
      .then((result) => {
        if (!cancelled) setData(result);
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Something went wrong');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
    // deps are caller-controlled; version re-triggers after mutations
  }, [...deps, version]);

  return { data, error, loading, reload };
}
