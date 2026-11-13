import { describe, expect, it } from 'vitest';
import { createRateLimiter } from './rate-limit';

describe('createRateLimiter', () => {
  it('allows requests up to the limit inside the window', () => {
    let current = 0;
    const limiter = createRateLimiter(2, 1000, () => current);

    expect(limiter.allow('ip')).toBe(true);
    expect(limiter.allow('ip')).toBe(true);
    expect(limiter.allow('ip')).toBe(false);
  });

  it('resets after the window', () => {
    let current = 0;
    const limiter = createRateLimiter(1, 1000, () => current);

    expect(limiter.allow('ip')).toBe(true);
    expect(limiter.allow('ip')).toBe(false);

    current = 1001;
    expect(limiter.allow('ip')).toBe(true);
  });

  it('keeps separate buckets per key', () => {
    let current = 0;
    const limiter = createRateLimiter(1, 1000, () => current);

    expect(limiter.allow('a')).toBe(true);
    expect(limiter.allow('b')).toBe(true);
    expect(limiter.allow('a')).toBe(false);
  });
});
