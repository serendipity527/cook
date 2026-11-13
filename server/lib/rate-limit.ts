export interface RateLimiter {
  allow(key: string): boolean;
}

export function createRateLimiter(
  limit: number,
  windowMs: number,
  now: () => number = Date.now,
): RateLimiter {
  const buckets = new Map<string, { count: number; resetAt: number }>();

  return {
    allow(key) {
      const timestamp = now();
      const bucket = buckets.get(key);

      if (!bucket || bucket.resetAt <= timestamp) {
        buckets.set(key, { count: 1, resetAt: timestamp + windowMs });
        return true;
      }

      if (bucket.count >= limit) {
        return false;
      }

      bucket.count += 1;
      return true;
    },
  };
}
