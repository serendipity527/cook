import { describe, expect, it } from 'vitest';
import { RecipeSchema, StepSchema, isTimedStep } from './recipe';

const validRecipe = {
  schemaVersion: 1,
  id: 'r_tomato_egg',
  title: '番茄炒蛋',
  servings: 2,
  tags: ['家常', '快手菜'],
  prep: [{ id: 'p1', text: '番茄 2 个，切滚刀块' }],
  steps: [
    { id: 's1', text: '锅中倒油，中火烧热', speak: '中火热油', kind: 'timed', durationSec: 45 },
    { id: 's2', text: '炒至蛋液凝固', kind: 'judgment', suggestRange: [30, 60] },
  ],
  source: 'builtin',
  createdAt: 0,
  updatedAt: 0,
};

describe('StepSchema', () => {
  it('accepts a timed step with a duration', () => {
    const step = StepSchema.parse({
      id: 's1',
      text: '倒油',
      kind: 'timed',
      durationSec: 30,
    });
    expect(step.durationSec).toBe(30);
    expect(isTimedStep(step)).toBe(true);
  });

  it('rejects a timed step without a duration', () => {
    const result = StepSchema.safeParse({ id: 's1', text: '倒油', kind: 'timed' });
    expect(result.success).toBe(false);
  });

  it('accepts durations measured in hours and days', () => {
    const hour = StepSchema.parse({
      id: 's1',
      text: '腌一小时',
      kind: 'timed',
      durationSec: 60 * 60,
    });
    expect(hour.durationSec).toBe(3600);

    const day = StepSchema.parse({
      id: 's2',
      text: '腌一天',
      kind: 'timed',
      durationSec: 24 * 60 * 60,
    });
    expect(day.durationSec).toBe(86400);
  });

  it('accepts a photo asset on a step', () => {
    const step = StepSchema.parse({
      id: 's1',
      text: '倒油',
      kind: 'timed',
      durationSec: 30,
      photoAssetId: 'a_1',
    });
    expect(step.photoAssetId).toBe('a_1');
  });

  it('accepts a static photo path on a step', () => {
    const step = StepSchema.parse({
      id: 's1',
      text: '倒油',
      kind: 'timed',
      durationSec: 30,
      photoSrc: '/recipes/demo/step.jpg',
    });
    expect(step.photoSrc).toBe('/recipes/demo/step.jpg');
  });

  it('accepts a longer detail alongside a short title', () => {
    const step = StepSchema.parse({
      id: 's1',
      text: '中火热油',
      detail: '锅中倒油，中火烧到油面微微晃动。',
      kind: 'timed',
      durationSec: 30,
    });
    expect(step.detail).toContain('中火');
  });

  it('rejects a judgment step carrying a duration', () => {
    const result = StepSchema.safeParse({
      id: 's1',
      text: '炒至凝固',
      kind: 'judgment',
      durationSec: 30,
    });
    expect(result.success).toBe(false);
  });

  it('rejects an inverted suggest range', () => {
    const result = StepSchema.safeParse({
      id: 's1',
      text: '炒至凝固',
      kind: 'judgment',
      suggestRange: [60, 30],
    });
    expect(result.success).toBe(false);
  });
});

describe('RecipeSchema', () => {
  it('accepts a complete recipe', () => {
    const recipe = RecipeSchema.parse(validRecipe);
    expect(recipe.title).toBe('番茄炒蛋');
    expect(recipe.steps).toHaveLength(2);
  });

  it('defaults tags to an empty array', () => {
    const recipe = RecipeSchema.parse({ ...validRecipe, tags: undefined });
    expect(recipe.tags).toEqual([]);
  });

  it('rejects a recipe without steps', () => {
    const result = RecipeSchema.safeParse({ ...validRecipe, steps: [] });
    expect(result.success).toBe(false);
  });

  it('rejects an empty prep text', () => {
    const result = RecipeSchema.safeParse({
      ...validRecipe,
      prep: [{ id: 'p1', text: '' }],
    });
    expect(result.success).toBe(false);
  });

  it('rejects an unknown source', () => {
    const result = RecipeSchema.safeParse({ ...validRecipe, source: 'imported' });
    expect(result.success).toBe(false);
  });
});
