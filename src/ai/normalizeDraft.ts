import type { DraftSpec, Recipe } from '@shared/schema';
import { newId } from '@/data/repo';

export function normalizeDraft(spec: DraftSpec, base?: Recipe, now = Date.now()): Recipe {
  const sameStepCount = base?.steps.length === spec.steps.length;

  return {
    schemaVersion: 1,
    id: base?.id ?? newId('r'),
    title: spec.title,
    subtitle: base?.subtitle,
    servings: spec.servings,
    tags: spec.tags ?? base?.tags ?? [],
    coverAssetId: base?.coverAssetId,
    prep: spec.prep.map((item, index) => ({
      id: base?.prep[index]?.id ?? newId('p'),
      ...item,
    })),
    steps: spec.steps.map((step, index) => ({
      id: sameStepCount ? base!.steps[index]!.id : newId('s'),
      ...step,
    })),
    source: base?.source === 'user' ? 'user' : 'ai',
    estimatedMinutes: spec.estimatedMinutes,
    createdAt: base?.createdAt ?? now,
    updatedAt: now,
  };
}
