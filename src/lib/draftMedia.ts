import type { DraftSpec } from '@shared/schema';

/**
 * AI 每轮回传的草稿不带图片，按位置把上一版的图片接回去。
 */
export function mergeDraftPhotos(
  previous: DraftSpec | null | undefined,
  next: DraftSpec,
): DraftSpec {
  if (!previous) {
    return next;
  }

  return {
    ...next,
    prep: next.prep.map((item, index) => ({
      ...item,
      photoAssetId: item.photoAssetId ?? previous.prep[index]?.photoAssetId,
    })),
    steps: next.steps.map((step, index) => ({
      ...step,
      photoAssetId: step.photoAssetId ?? previous.steps[index]?.photoAssetId,
    })),
  };
}
