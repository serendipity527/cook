import { describe, expect, it } from 'vitest';
import {
  formatAge,
  formatAgeLabel,
  formatEstimatedMinutes,
  formatRange,
  formatSeconds,
} from './format';

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

  it('shows hours for long durations', () => {
    expect(formatSeconds(3600)).toBe('1 小时');
    expect(formatSeconds(5400)).toBe('1 小时 30 分钟');
  });

  it('shows days for very long durations', () => {
    expect(formatSeconds(86400)).toBe('1 天');
    expect(formatSeconds(90000)).toBe('1 天 1 小时');
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

describe('formatAge', () => {
  it('buckets hours and days without a direction', () => {
    expect(formatAge(30 * 60 * 1000)).toBe('不到 1 小时');
    expect(formatAge(3 * 60 * 60 * 1000)).toBe('3 小时');
    expect(formatAge(3 * 24 * 60 * 60 * 1000)).toBe('3 天');
  });
});

describe('formatAgeLabel', () => {
  it('marks fresh cooks as just now and older ones with 前', () => {
    expect(formatAgeLabel(30 * 60 * 1000)).toBe('刚刚');
    expect(formatAgeLabel(3 * 60 * 60 * 1000)).toBe('3 小时前');
    expect(formatAgeLabel(3 * 24 * 60 * 60 * 1000)).toBe('3 天前');
  });
});
