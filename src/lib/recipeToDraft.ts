import type { DraftSpec, Recipe } from '@shared/schema';

export function recipeToDraft(recipe: Recipe): DraftSpec {
  return {
    title: recipe.title,
    servings: recipe.servings,
    estimatedMinutes: recipe.estimatedMinutes,
    tags: recipe.tags,
    prep: recipe.prep.map((item) => ({
      text: item.text,
      tip: item.tip,
      photoAssetId: item.photoAssetId,
      photoSrc: item.photoSrc,
    })),
    steps: recipe.steps.map((step) => ({
      text: step.text,
      detail: step.detail,
      speak: step.speak,
      kind: step.kind,
      durationSec: step.durationSec,
      suggestRange: step.suggestRange,
      heat: step.heat,
      tip: step.tip,
      ingredients: step.ingredients,
      photoAssetId: step.photoAssetId,
      photoSrc: step.photoSrc,
    })),
    questions: [],
  };
}
