import { describe, expect, it } from 'vitest';
import type { Recipe } from '@shared/schema';
import { builtinRecipes } from '@/data/builtin';
import { normalizeDraft } from '@/ai/normalizeDraft';
import { recipeToDraft } from './recipeToDraft';

const recipe: Recipe = {
  ...builtinRecipes[0]!,
  id: 'r_user_edit',
  source: 'user',
  createdAt: 100,
  updatedAt: 100,
};

describe('recipeToDraft', () => {
  it('strips ids and copies editable content', () => {
    const spec = recipeToDraft(recipe);

    expect(spec.title).toBe(recipe.title);
    expect(spec.servings).toBe(recipe.servings);
    expect(spec.steps).toHaveLength(recipe.steps.length);
    expect(spec.steps[0]).not.toHaveProperty('id');
    expect(spec.prep[0]).not.toHaveProperty('id');
    expect(spec.questions).toEqual([]);
  });

  it('round-trips back to the same recipe ids and source', () => {
    const rebuilt = normalizeDraft(recipeToDraft(recipe), recipe, 999);

    expect(rebuilt.id).toBe(recipe.id);
    expect(rebuilt.source).toBe('user');
    expect(rebuilt.createdAt).toBe(100);
    expect(rebuilt.updatedAt).toBe(999);
    expect(rebuilt.steps.map((step) => step.id)).toEqual(
      recipe.steps.map((step) => step.id),
    );
    expect(rebuilt.prep.map((item) => item.id)).toEqual(recipe.prep.map((item) => item.id));
  });
});
