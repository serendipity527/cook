import { beforeEach, describe, expect, it } from 'vitest';
import type { DraftSpec } from '@shared/schema';
import { useChatStore } from './useChatStore';

const draft: DraftSpec = {
  title: '番茄炒蛋',
  servings: 2,
  prep: [{ text: '番茄切块' }],
  steps: [{ text: '倒油烧热', kind: 'timed', durationSec: 30 }],
  questions: [],
};

beforeEach(() => {
  useChatStore.getState().reset();
});

describe('useChatStore', () => {
  it('appends messages in order', () => {
    useChatStore.getState().appendMessage({ role: 'user', content: '你好' });
    useChatStore.getState().appendMessage({ role: 'assistant', content: '你好，我是开火。' });

    expect(useChatStore.getState().messages.map((message) => message.role)).toEqual([
      'user',
      'assistant',
    ]);
  });

  it('stores a draft and recipe ids', () => {
    useChatStore.getState().setDraft(draft);
    useChatStore.getState().setRecipeIds(['r1', 'r2']);

    expect(useChatStore.getState().draft?.title).toBe('番茄炒蛋');
    expect(useChatStore.getState().recipeIds).toEqual(['r1', 'r2']);
  });

  it('clears everything on reset', () => {
    useChatStore.getState().appendMessage({ role: 'user', content: '你好' });
    useChatStore.getState().setDraft(draft);
    useChatStore.getState().reset();

    expect(useChatStore.getState().messages).toEqual([]);
    expect(useChatStore.getState().draft).toBeNull();
    expect(useChatStore.getState().recipeIds).toEqual([]);
  });
});
