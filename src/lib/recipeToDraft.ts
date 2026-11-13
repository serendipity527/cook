import type { DraftSpec, Recipe } from '@shared/schema';

export function recipeToDraft(recipe: Recipe): DraftSpec {
  return {
    title: recipe.title,
    servings: recipe.servings,
    estimatedMinutes: recipe.estimatedMinutes,
    prep: recipe.prep.map((item) => ({ text: item.text, tip: item.tip })),
    steps: recipe.steps.map((step) => ({
      text: step.text,
      speak: step.speak,
      kind: step.kind,
      durationSec: step.durationSec,
      suggestRange: step.suggestRange,
      heat: step.heat,
      tip: step.tip,
      ingredients: step.ingredients,
    })),
    questions: [],
  };
}
