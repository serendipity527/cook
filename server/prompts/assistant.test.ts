import { describe, expect, it } from 'vitest';
import type { AssistantRequest } from '@shared/schema';
import {
  ASSISTANT_SYSTEM_PROMPT,
  ASSISTANT_TEXT_CONTRACT,
  buildAssistantPrompt,
} from './assistant';

const request: AssistantRequest = {
  message: '我有哪些菜谱？',
  draft: null,
  history: [
    { role: 'user', content: '你好' },
    { role: 'assistant', content: '你好，我是开火。' },
  ],
  recipes: [
    {
      id: 'r_tomato_egg',
      title: '番茄炒蛋',
      tags: ['家常'],
      estimatedMinutes: 15,
      source: 'builtin',
    },
  ],
  locale: 'zh-CN',
};

describe('assistant prompt', () => {
  it('tells the model not to turn greetings into recipes', () => {
    expect(ASSISTANT_SYSTEM_PROMPT).toContain('绝对不要因为一句问候生成菜谱');
    expect(ASSISTANT_SYSTEM_PROMPT).toContain('intent=chat');
  });

  it('defines the assistant JSON contract', () => {
    expect(ASSISTANT_TEXT_CONTRACT).toContain('"intent"');
    expect(ASSISTANT_TEXT_CONTRACT).toContain('"tags"');
    expect(ASSISTANT_TEXT_CONTRACT).toContain('create_recipe / update_recipe 必须提供 draft');
  });

  it('includes the recipe index, history and current message', () => {
    const prompt = buildAssistantPrompt(request);
    expect(prompt).toContain('id=r_tomato_egg');
    expect(prompt).toContain('番茄炒蛋');
    expect(prompt).toContain('用户：你好');
    expect(prompt).toContain('用户最新消息：\n我有哪些菜谱？');
  });

  it('renders empty sections clearly', () => {
    const prompt = buildAssistantPrompt({
      message: '你好',
      draft: null,
      history: [],
      recipes: [],
      locale: 'zh-CN',
    });
    expect(prompt).toContain('（暂无菜谱）');
    expect(prompt).toContain('当前草稿：\n（无）');
    expect(prompt).toContain('最近对话：\n（无）');
  });
});
