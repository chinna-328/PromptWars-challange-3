import { useEffect, useState } from 'react';

/**
 * Returns a copy of `value` that only updates after it has stopped
 * changing for `delayMs`. PERF: inputs that trigger recomputation (the
 * live emissions preview) recompute once per pause, not once per
 * keystroke.
 *
 * @param value - the rapidly-changing source value
 * @param delayMs - quiet period before the debounced value updates
 * @returns the debounced value
 */
export function useDebouncedValue<T>(value: T, delayMs: number): T {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timer = window.setTimeout(() => setDebounced(value), delayMs);
    return () => window.clearTimeout(timer);
  }, [value, delayMs]);

  return debounced;
}
