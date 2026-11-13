import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { formatClock, useNow } from './useCountdown';

describe('formatClock', () => {
  it('formats zero as 00:00', () => {
    expect(formatClock(0)).toBe('00:00');
  });

  it('rounds partial seconds up so the last second is visible', () => {
    expect(formatClock(999)).toBe('00:01');
  });

  it('formats minutes and seconds', () => {
    expect(formatClock(60_000)).toBe('01:00');
    expect(formatClock(3_599_000)).toBe('59:59');
  });

  it('never shows negative time', () => {
    expect(formatClock(-5000)).toBe('00:00');
  });
});

describe('useNow', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(1000);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('ticks while active', () => {
    const { result } = renderHook(() => useNow(true, 200));
    expect(result.current).toBe(1000);

    act(() => {
      vi.advanceTimersByTime(600);
    });

    expect(result.current).toBe(1600);
  });

  it('stays still while inactive', () => {
    const { result } = renderHook(() => useNow(false, 200));

    act(() => {
      vi.advanceTimersByTime(600);
    });

    expect(result.current).toBe(1000);
  });
});
