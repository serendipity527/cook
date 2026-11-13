import { describe, expect, it } from 'vitest';
import { RecipeSchema } from '@shared/schema';
import { builtinRecipes } from './index';

describe('builtin recipes', () => {
  it('ships three valid recipes', () => {
    expect(builtinRecipes).toHaveLength(3);

    for (const recipe of builtinRecipes) {
      const result = RecipeSchema.safeParse(recipe);
      expect(result.success, `${recipe.title} should be valid`).toBe(true);
    }
  });

  it('uses unique ids', () => {
    const ids = builtinRecipes.map((recipe) => recipe.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('gives every recipe a title and at least one step', () => {
    for (const recipe of builtinRecipes) {
      expect(recipe.title.length).toBeGreaterThan(0);
      expect(recipe.steps.length).toBeGreaterThan(0);
    }
  });
});
