import { describe, expect, it } from 'vitest';
import type { DraftSpec } from '@shared/schema';
import { buildRecipePrompt, RECIPE_SYSTEM_PROMPT } from './recipe';

const draft: DraftSpec = {
  title: '番茄炒蛋',
  servings: 2,
  prep: [{ text: '番茄切块' }],
  steps: [{ text: '倒油烧热', kind: 'timed', durationSec: 45 }],
  questions: [],
};

describe('recipe prompt', () => {
  it('states the core rules', () => {
    expect(RECIPE_SYSTEM_PROMPT).toContain('一个动作一步');
    expect(RECIPE_SYSTEM_PROMPT).toContain('最多 3 个');
    expect(RECIPE_SYSTEM_PROMPT).toContain('不要输出 id');
  });

  it('builds a first-draft prompt from the user message', () => {
    const prompt = buildRecipePrompt('番茄炒蛋，两个人吃');
    expect(prompt).toContain('番茄炒蛋，两个人吃');
    expect(prompt).toContain('完整');
  });

  it('builds an edit prompt that includes the current draft', () => {
    const prompt = buildRecipePrompt('改成 3 人份', draft);
    expect(prompt).toContain('"title": "番茄炒蛋"');
    expect(prompt).toContain('改成 3 人份');
    expect(prompt).toContain('只改用户要求的部分');
  });
});
