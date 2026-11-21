import { describe, expect, it } from 'vitest';
import type { DraftSpec } from '@shared/schema';
import { toTimedDraft, toTimedStep } from './timedSteps';

const spec: DraftSpec = {
  title: '番茄炒蛋',
  servings: 2,
  prep: [],
  steps: [
    { text: '倒油', kind: 'timed', durationSec: 45 },
    { text: '看状态', kind: 'judgment', suggestRange: [30, 60] },
    { text: '装盘', kind: 'judgment' },
  ],
  questions: [],
};

describe('toTimedDraft', () => {
  it('keeps timed steps untouched', () => {
    expect(toTimedDraft(spec).steps[0]).toEqual(spec.steps[0]);
  });

  it('converts judgment steps using the middle of the suggested range', () => {
    expect(toTimedDraft(spec).steps[1]).toMatchObject({ kind: 'timed', durationSec: 45 });
    expect(toTimedDraft(spec).steps[1]).not.toHaveProperty('suggestRange');
  });

  it('falls back to 30 seconds when no range is set', () => {
    expect(toTimedDraft(spec).steps[2]).toMatchObject({ kind: 'timed', durationSec: 30 });
  });

  it('returns the same object when every step is already timed', () => {
    const allTimed: DraftSpec = {
      ...spec,
      steps: [{ text: '倒油', kind: 'timed', durationSec: 45 }],
    };

    expect(toTimedDraft(allTimed)).toBe(allTimed);
  });
});

describe('toTimedStep', () => {
  it('clamps tiny durations to the schema minimum', () => {
    expect(toTimedStep({ text: '看状态', kind: 'judgment', suggestRange: [1, 2] })).toMatchObject({
      kind: 'timed',
      durationSec: 3,
    });
  });
});
