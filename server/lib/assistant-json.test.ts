import { describe, expect, it } from 'vitest';
import { extractAssistantJson } from './assistant-json';

const draft = {
  title: '番茄炒蛋',
  servings: 2,
  prep: [{ text: '番茄切块' }],
  steps: [{ text: '倒油烧热', kind: 'timed', durationSec: 30 }],
  questions: [],
};

describe('extractAssistantJson', () => {
  it('accepts a chat turn without a draft', () => {
    const turn = extractAssistantJson('{"intent":"chat","reply":"你好，我是开火。"}');
    expect(turn.intent).toBe('chat');
    expect(turn.draft).toBeUndefined();
  });

  it('accepts a create turn with a draft', () => {
    const turn = extractAssistantJson(
      JSON.stringify({ intent: 'create_recipe', reply: '整理好了', draft }),
    );
    expect(turn.intent).toBe('create_recipe');
    expect(turn.draft?.title).toBe('番茄炒蛋');
  });

  it('rejects a create turn without a draft', () => {
    expect(() =>
      extractAssistantJson('{"intent":"create_recipe","reply":"整理好了"}'),
    ).toThrow('AI 没有返回符合结构的助手回复 JSON');
  });

  it('strips markdown fences', () => {
    const turn = extractAssistantJson(
      `\`\`\`json\n${JSON.stringify({ intent: 'chat', reply: '在的' })}\n\`\`\``,
    );
    expect(turn.reply).toBe('在的');
  });
});
