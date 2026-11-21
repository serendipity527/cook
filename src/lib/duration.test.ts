import { describe, expect, it } from 'vitest';
import {
  durationFactor,
  pickDurationUnit,
  toDurationSeconds,
  toDurationValue,
} from './duration';

describe('pickDurationUnit', () => {
  it('picks the smallest readable unit', () => {
    expect(pickDurationUnit(45)).toBe('sec');
    expect(pickDurationUnit(90)).toBe('min');
    expect(pickDurationUnit(3600)).toBe('hour');
    expect(pickDurationUnit(86400)).toBe('day');
  });
});

describe('toDurationValue', () => {
  it('converts seconds into the chosen unit', () => {
    expect(toDurationValue(90, 'min')).toBe(1.5);
    expect(toDurationValue(86400, 'day')).toBe(1);
  });
});

describe('toDurationSeconds', () => {
  it('converts back and rounds', () => {
    expect(toDurationSeconds(1.5, 'min')).toBe(90);
    expect(toDurationSeconds(2, 'hour')).toBe(7200);
    expect(toDurationSeconds(3, 'day')).toBe(259200);
  });

  it('clamps to the schema limits', () => {
    expect(toDurationSeconds(0.1, 'sec')).toBe(3);
    expect(toDurationSeconds(999, 'day')).toBe(30 * 24 * 60 * 60);
  });
});

describe('durationFactor', () => {
  it('knows each unit', () => {
    expect(durationFactor('sec')).toBe(1);
    expect(durationFactor('min')).toBe(60);
    expect(durationFactor('hour')).toBe(3600);
    expect(durationFactor('day')).toBe(86400);
  });
});
