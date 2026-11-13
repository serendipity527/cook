import { describe, expect, it } from 'vitest';
import type { Recipe, StepLog } from '@shared/schema';
import { applyDurationSuggestions, suggestDurations } from './calibration';

const recipe: Recipe = {
  schemaVersion: 1,
  id: 'r_calibration',
  title: '校准测试',
  servings: 1,
  tags: [],
  prep: [],
  steps: [
    { id: 's1', text: '炒蛋', kind: 'timed', durationSec: 60 },
    { id: 's2', text: '看状态', kind: 'judgment' },
    { id: 's3', text: '收汁', kind: 'timed', durationSec: 120 },
  ],
  source: 'user',
  createdAt: 0,
  updatedAt: 0,
};

function log(stepId: string, actualSec: number, skipped = false): StepLog {
  return { stepId, actualSec, skipped };
}

describe('suggestDurations', () => {
  it('suggests an update when the step ran at least 10 seconds over', () => {
    const suggestions = suggestDurations(recipe, [log('s1', 75)]);
    expect(suggestions).toEqual([
      { stepId: 's1', plannedSec: 60, actualSec: 75, nextSec: 75 },
    ]);
  });

  it('suggests an update when the step ran 25% over', () => {
    const suggestions = suggestDurations(recipe, [log('s3', 150)]);
    expect(suggestions[0]?.nextSec).toBe(150);
  });

  it('ignores small deviations', () => {
    expect(suggestDurations(recipe, [log('s1', 65)])).toEqual([]);
  });

  it('ignores judgment steps', () => {
    expect(suggestDurations(recipe, [log('s2', 999)])).toEqual([]);
  });

  it('ignores skipped steps', () => {
    expect(suggestDurations(recipe, [log('s3', 200, true)])).toEqual([]);
  });

  it('ignores a step that took more than three times the plan', () => {
    expect(suggestDurations(recipe, [log('s1', 200)])).toEqual([]);
  });

  it('rounds the suggested duration to five seconds', () => {
    const suggestions = suggestDurations(recipe, [log('s1', 77)]);
    expect(suggestions[0]?.nextSec).toBe(75);
  });
});

describe('applyDurationSuggestions', () => {
  it('updates only the suggested steps and bumps updatedAt', () => {
    const updated = applyDurationSuggestions(
      recipe,
      [{ stepId: 's1', plannedSec: 60, actualSec: 75, nextSec: 75 }],
      1234,
    );

    expect(updated.steps[0]).toMatchObject({ id: 's1', durationSec: 75 });
    expect(updated.steps[2]).toMatchObject({ id: 's3', durationSec: 120 });
    expect(updated.updatedAt).toBe(1234);
    expect(recipe.steps[0]).toMatchObject({ durationSec: 60 });
  });

  it('returns the same recipe when there is nothing to apply', () => {
    expect(applyDurationSuggestions(recipe, [], 1234)).toBe(recipe);
  });
});
