import { RecipeSchema, type Recipe } from '@shared/schema';
import colaWings from './cola-wings.json';
import garlicBroccoli from './garlic-broccoli.json';
import tomatoEgg from './tomato-egg.json';

const rawRecipes = [tomatoEgg, garlicBroccoli, colaWings];

export const builtinRecipes: Recipe[] = rawRecipes.map((raw, index) => {
  const result = RecipeSchema.safeParse(raw);

  if (!result.success) {
    throw new Error(`内置菜谱数据无效（第 ${index + 1} 个）：${result.error.message}`);
  }

  return result.data;
});

export const builtinRecipeMap = new Map(builtinRecipes.map((recipe) => [recipe.id, recipe]));
