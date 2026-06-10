import { afterEach, describe, expect, it, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useDebouncedValue } from './useDebouncedValue';

afterEach(() => {
  vi.useRealTimers();
});

describe('useDebouncedValue', () => {
  it('only exposes the new value after the quiet period elapses', () => {
    vi.useFakeTimers();
    const { result, rerender } = renderHook(({ value }) => useDebouncedValue(value, 300), {
      initialProps: { value: 'a' },
    });
    expect(result.current).toBe('a');

    rerender({ value: 'ab' });
    act(() => vi.advanceTimersByTime(299));
    expect(result.current).toBe('a'); // still quiet-period

    act(() => vi.advanceTimersByTime(1));
    expect(result.current).toBe('ab');
  });

  it('restarts the timer on every change (one update per pause, not per keystroke)', () => {
    vi.useFakeTimers();
    const { result, rerender } = renderHook(({ value }) => useDebouncedValue(value, 300), {
      initialProps: { value: '1' },
    });
    rerender({ value: '12' });
    act(() => vi.advanceTimersByTime(200));
    rerender({ value: '123' });
    act(() => vi.advanceTimersByTime(200));
    expect(result.current).toBe('1'); // timer kept restarting
    act(() => vi.advanceTimersByTime(100));
    expect(result.current).toBe('123');
  });
});
