import { describe, expect, it } from 'vitest';
import { extractDraftJson } from './draft-json';

const validDraft = {
  title: '番茄炒蛋',
  servings: 2,
  estimatedMinutes: 15,
  prep: [{ text: '番茄切块' }],
  steps: [{ text: '倒油烧热', kind: 'timed', durationSec: 45 }],
  questions: [],
};

describe('extractDraftJson', () => {
  it('parses a pure JSON object', () => {
    const draft = extractDraftJson(JSON.stringify(validDraft));
    expect(draft.title).toBe('番茄炒蛋');
  });

  it('strips markdown fences', () => {
    const draft = extractDraftJson(`\`\`\`json\n${JSON.stringify(validDraft)}\n\`\`\``);
    expect(draft.steps).toHaveLength(1);
  });

  it('finds the object inside surrounding prose', () => {
    const draft = extractDraftJson(
      `好的，这是菜谱：\n${JSON.stringify(validDraft)}\n希望你喜欢。`,
    );
    expect(draft.title).toBe('番茄炒蛋');
  });

  it('skips an invalid object and picks the valid one', () => {
    const invalid = JSON.stringify({
      ...validDraft,
      steps: [{ text: '倒油', kind: 'timed' }],
    });
    const draft = extractDraftJson(`${invalid}\n${JSON.stringify(validDraft)}`);
    expect(draft.steps[0]).toMatchObject({ kind: 'timed', durationSec: 45 });
  });

  it('rejects a JSON object that fails the schema', () => {
    const invalid = JSON.stringify({
      ...validDraft,
      steps: [{ text: '倒油', kind: 'timed' }],
    });
    expect(() => extractDraftJson(invalid)).toThrow('AI 没有返回符合结构的菜谱 JSON');
  });
});
