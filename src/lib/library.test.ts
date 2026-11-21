import { describe, expect, it } from 'vitest';
import type { CookSession, Recipe } from '@shared/schema';
import { buildLibrary, matchesSearch } from './library';

const recipe = (overrides: Partial<Recipe> & { id: string }): Recipe => ({
  schemaVersion: 1,
  title: '菜',
  servings: 1,
  tags: [],
  prep: [],
  steps: [{ id: 's1', text: '步骤', kind: 'judgment', suggestRange: [30, 60] }],
  source: 'user',
  createdAt: 0,
  updatedAt: 0,
  ...overrides,
});

const session = (recipeId: string, startedAt: number): CookSession => ({
  id: `sess_${recipeId}_${startedAt}`,
  recipeId,
  recipeUpdatedAt: 0,
  startedAt,
  status: 'completed',
  steps: [],
});

const cooked = recipe({ id: 'r_cooked', title: '番茄炒蛋', updatedAt: 100 });
const fresh = recipe({ id: 'r_fresh', title: '新菜', updatedAt: 900 });
const old = recipe({ id: 'r_old', title: '旧菜', updatedAt: 100, tags: ['快手菜'] });

describe('buildLibrary', () => {
  it('puts cooked recipes first by their latest session', () => {
    const library = buildLibrary(
      [cooked, fresh],
      [session('r_cooked', 1000), session('r_cooked', 3000)],
    );

    expect(library.map((entry) => entry.recipe.id)).toEqual(['r_cooked', 'r_fresh']);
    expect(library[0]?.lastCookedAt).toBe(3000);
  });

  it('sorts never-cooked recipes by updatedAt', () => {
    const library = buildLibrary([cooked, fresh, old], []);

    expect(library.map((entry) => entry.recipe.id)).toEqual(['r_fresh', 'r_cooked', 'r_old']);
  });

  it('keeps cooked recipes ahead of newer uncooked ones', () => {
    const library = buildLibrary([fresh, cooked], [session('r_cooked', 100)]);

    expect(library.map((entry) => entry.recipe.id)).toEqual(['r_cooked', 'r_fresh']);
  });
});

describe('matchesSearch', () => {
  it('matches everything on a blank query', () => {
    expect(matchesSearch(cooked, '  ')).toBe(true);
  });

  it('matches by title or tag, case-insensitive', () => {
    expect(matchesSearch(old, '旧')).toBe(true);
    expect(matchesSearch(old, '快手')).toBe(true);
    expect(matchesSearch(old, '快手菜'.toUpperCase())).toBe(true);
    expect(matchesSearch(old, '不存在')).toBe(false);
  });

  it('matches by prep ingredients', () => {
    const withEgg = recipe({
      id: 'r_egg',
      title: '番茄炒蛋',
      prep: [{ id: 'p1', text: '鸡蛋 3 个，打散' }],
    });

    expect(matchesSearch(withEgg, '鸡蛋')).toBe(true);
    expect(matchesSearch(withEgg, '打散')).toBe(true);
    expect(matchesSearch(withEgg, '牛肉')).toBe(false);
  });
});
