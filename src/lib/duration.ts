import { STEP_DURATION_MAX_SEC, STEP_DURATION_MIN_SEC } from '@shared/schema';

export type DurationUnit = 'sec' | 'min' | 'hour' | 'day';

export const DURATION_UNITS: Array<{ unit: DurationUnit; label: string; factor: number }> = [
  { unit: 'sec', label: '秒', factor: 1 },
  { unit: 'min', label: '分钟', factor: 60 },
  { unit: 'hour', label: '小时', factor: 60 * 60 },
  { unit: 'day', label: '天', factor: 24 * 60 * 60 },
];

export function durationFactor(unit: DurationUnit): number {
  return DURATION_UNITS.find((item) => item.unit === unit)?.factor ?? 1;
}

/** 按秒数选一个读起来最自然的单位。 */
export function pickDurationUnit(seconds: number): DurationUnit {
  if (seconds >= 24 * 60 * 60) {
    return 'day';
  }

  if (seconds >= 60 * 60) {
    return 'hour';
  }

  if (seconds >= 60) {
    return 'min';
  }

  return 'sec';
}

/** 秒数换成指定单位下的数值，保留两位小数便于 1.5 分钟这类输入。 */
export function toDurationValue(seconds: number, unit: DurationUnit): number {
  const value = seconds / durationFactor(unit);
  return Math.round(value * 100) / 100;
}

/** 指定单位下的数值换成秒数，并夹在 schema 允许的范围内。 */
export function toDurationSeconds(value: number, unit: DurationUnit): number {
  const seconds = Math.round(value * durationFactor(unit));
  return Math.min(STEP_DURATION_MAX_SEC, Math.max(STEP_DURATION_MIN_SEC, seconds));
}
