import { describe, expect, it } from 'vitest';
import { RecipeSchema, type DraftSpec, type Recipe } from '@shared/schema';
import { normalizeDraft } from './normalizeDraft';

const spec: DraftSpec = {
  title: '番茄炒蛋',
  servings: 2,
  estimatedMinutes: 15,
  prep: [{ text: '番茄切块' }, { text: '鸡蛋打散' }],
  steps: [
    { text: '倒油烧热', kind: 'timed', durationSec: 45 },
    { text: '炒至凝固', kind: 'judgment', suggestRange: [30, 60] },
  ],
  questions: [],
};

const base: Recipe = {
  schemaVersion: 1,
  id: 'r_base',
  title: '旧标题',
  subtitle: '旧副标题',
  servings: 1,
  tags: ['家常'],
  prep: [
    { id: 'p_old_1', text: '旧备菜 1' },
    { id: 'p_old_2', text: '旧备菜 2' },
  ],
  steps: [
    { id: 's_old_1', text: '旧步骤 1', kind: 'timed', durationSec: 30 },
    { id: 's_old_2', text: '旧步骤 2', kind: 'judgment' },
  ],
  source: 'user',
  createdAt: 100,
  updatedAt: 100,
};

describe('normalizeDraft', () => {
  it('creates a valid recipe with generated ids', () => {
    const recipe = normalizeDraft(spec, undefined, 500);

    expect(RecipeSchema.safeParse(recipe).success).toBe(true);
    expect(recipe.id).toMatch(/^r_/);
    expect(recipe.source).toBe('ai');
    expect(recipe.createdAt).toBe(500);
    expect(recipe.updatedAt).toBe(500);
    expect(recipe.prep[0]?.id).toMatch(/^p_/);
    expect(recipe.steps[0]?.id).toMatch(/^s_/);
  });

  it('preserves ids, source and createdAt when editing a same-length draft', () => {
    const recipe = normalizeDraft(spec, base, 500);

    expect(recipe.id).toBe(base.id);
    expect(recipe.source).toBe('user');
    expect(recipe.createdAt).toBe(100);
    expect(recipe.updatedAt).toBe(500);
    expect(recipe.prep.map((item) => item.id)).toEqual(['p_old_1', 'p_old_2']);
    expect(recipe.steps.map((step) => step.id)).toEqual(['s_old_1', 's_old_2']);
    expect(recipe.subtitle).toBe('旧副标题');
    expect(recipe.tags).toEqual(['家常']);
  });

  it('regenerates step ids when the step count changes', () => {
    const recipe = normalizeDraft(
      { ...spec, steps: [...spec.steps, { text: '装盘', kind: 'judgment' }] },
      base,
      500,
    );

    expect(recipe.steps[0]?.id).not.toBe('s_old_1');
    expect(recipe.steps).toHaveLength(3);
  });
});
