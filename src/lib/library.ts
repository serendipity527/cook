import type { CookSession, Recipe } from '@shared/schema';

export interface LibraryEntry {
  recipe: Recipe;
  lastCookedAt?: number;
}

/**
 * 首页菜谱库的排序：做过的按最近一次开火时间倒序，
 * 没做过的按更新时间倒序，排在做过的后面。
 */
export function buildLibrary(recipes: Recipe[], sessions: CookSession[]): LibraryEntry[] {
  const lastCooked = new Map<string, number>();

  for (const session of sessions) {
    const current = lastCooked.get(session.recipeId);

    if (current === undefined || session.startedAt > current) {
      lastCooked.set(session.recipeId, session.startedAt);
    }
  }

  return recipes
    .map((recipe) => ({ recipe, lastCookedAt: lastCooked.get(recipe.id) }))
    .sort((a, b) => {
      const aTime = a.lastCookedAt ?? Number.NEGATIVE_INFINITY;
      const bTime = b.lastCookedAt ?? Number.NEGATIVE_INFINITY;

      if (aTime !== bTime) {
        return bTime - aTime;
      }

      return b.recipe.updatedAt - a.recipe.updatedAt;
    });
}

export function matchesSearch(recipe: Recipe, rawQuery: string): boolean {
  const query = rawQuery.trim().toLowerCase();

  if (query === '') {
    return true;
  }

  return (
    recipe.title.toLowerCase().includes(query) ||
    recipe.tags.some((tag) => tag.toLowerCase().includes(query))
  );
}
