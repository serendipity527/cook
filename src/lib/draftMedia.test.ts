import { describe, expect, it } from 'vitest';
import type { DraftSpec } from '@shared/schema';
import { mergeDraftPhotos } from './draftMedia';

const base: DraftSpec = {
  title: '番茄炒蛋',
  servings: 2,
  prep: [{ text: '番茄切块', photoAssetId: 'a_prep' }],
  steps: [{ text: '倒油', kind: 'timed', durationSec: 45, photoAssetId: 'a_step' }],
  questions: [],
};

describe('mergeDraftPhotos', () => {
  it('keeps photos the AI does not send back', () => {
    const next: DraftSpec = {
      ...base,
      prep: [{ text: '番茄切块' }],
      steps: [{ text: '倒油', kind: 'timed', durationSec: 60 }],
    };

    const merged = mergeDraftPhotos(base, next);

    expect(merged.prep[0]?.photoAssetId).toBe('a_prep');
    expect(merged.steps[0]?.photoAssetId).toBe('a_step');
    expect(merged.steps[0]).toMatchObject({ durationSec: 60 });
  });

  it('prefers photos from the newer draft', () => {
    const next: DraftSpec = {
      ...base,
      prep: [{ text: '番茄切块', photoAssetId: 'a_new' }],
      steps: [{ text: '倒油', kind: 'timed', durationSec: 45, photoAssetId: 'a_new_step' }],
    };

    const merged = mergeDraftPhotos(base, next);

    expect(merged.prep[0]?.photoAssetId).toBe('a_new');
    expect(merged.steps[0]?.photoAssetId).toBe('a_new_step');
  });

  it('passes the draft through when there is nothing to merge', () => {
    expect(mergeDraftPhotos(null, base)).toBe(base);
  });
});
