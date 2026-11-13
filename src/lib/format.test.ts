import { describe, expect, it } from 'vitest';
import { formatEstimatedMinutes, formatRange, formatSeconds } from './format';

describe('formatSeconds', () => {
  it('shows seconds below one minute', () => {
    expect(formatSeconds(0)).toBe('0 秒');
    expect(formatSeconds(45)).toBe('45 秒');
  });

  it('shows whole minutes without a seconds suffix', () => {
    expect(formatSeconds(60)).toBe('1 分钟');
    expect(formatSeconds(600)).toBe('10 分钟');
  });

  it('shows minutes and seconds together', () => {
    expect(formatSeconds(90)).toBe('1 分 30 秒');
  });

  it('never shows negative time', () => {
    expect(formatSeconds(-10)).toBe('0 秒');
  });
});

describe('formatRange', () => {
  it('formats both ends of a range', () => {
    expect(formatRange([30, 60])).toBe('30 秒–1 分钟');
  });
});

describe('formatEstimatedMinutes', () => {
  it('returns null when no estimate is known', () => {
    expect(formatEstimatedMinutes(undefined)).toBeNull();
  });

  it('prefixes the estimate', () => {
    expect(formatEstimatedMinutes(15)).toBe('约 15 分钟');
  });
});
