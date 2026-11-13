import { describe, expect, it } from 'vitest';
import { aiErrorMessage } from './aiError';

describe('aiErrorMessage', () => {
  it('unwraps the gateway error JSON', () => {
    expect(aiErrorMessage(new Error('{"error":"AI 未配置：请在 .env.local 设置 AI_API_KEY"}'))).toBe(
      'AI 未配置：请在 .env.local 设置 AI_API_KEY',
    );
  });

  it('keeps a plain error message', () => {
    expect(aiErrorMessage(new Error('网络断开'))).toBe('网络断开');
  });

  it('falls back for an empty message', () => {
    expect(aiErrorMessage(new Error(''))).toBe('生成失败，请稍后重试');
  });
});
