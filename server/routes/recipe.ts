import { Hono } from 'hono';
import { streamObject, type RepairTextFunction } from 'ai';
import { createOpenAI } from '@ai-sdk/openai';
import { DraftRequestSchema, DraftSpecSchema } from '@shared/schema';
import { createRateLimiter } from '../lib/rate-limit';
import { buildRecipePrompt, RECIPE_SYSTEM_PROMPT } from '../prompts/recipe';

export const recipeRoute = new Hono();

const limiter = createRateLimiter(20, 60_000);

const repairJson: RepairTextFunction = async ({ text }) => {
  const unfenced = text.replace(/^\s*```(?:json)?\s*/i, '').replace(/\s*```\s*$/, '');
  const start = unfenced.indexOf('{');
  const end = unfenced.lastIndexOf('}');

  return start >= 0 && end > start ? unfenced.slice(start, end + 1) : null;
};

recipeRoute.post('/draft', async (c) => {
  const ip =
    c.req.header('x-forwarded-for')?.split(',')[0]?.trim() ||
    c.req.header('x-real-ip') ||
    'local';

  if (!limiter.allow(ip)) {
    return c.json({ error: '请求太频繁，请稍后再试' }, 429);
  }

  const apiKey = process.env.AI_API_KEY?.trim();

  if (!apiKey) {
    return c.json({ error: 'AI 未配置：请在 .env.local 设置 AI_API_KEY' }, 503);
  }

  const body: unknown = await c.req.json().catch(() => null);
  const parsed = DraftRequestSchema.safeParse(body);

  if (!parsed.success) {
    return c.json({ error: '请求格式不正确' }, 400);
  }

  const provider = createOpenAI({
    apiKey,
    baseURL: process.env.AI_BASE_URL?.trim() || 'https://api.deepseek.com',
    name: 'kaihuo',
  });
  const model = provider(process.env.AI_MODEL?.trim() || 'deepseek-chat');

  try {
    const result = streamObject({
      model,
      schema: DraftSpecSchema,
      schemaName: 'RecipeDraft',
      schemaDescription: '一份可直接下厨的中文菜谱草稿',
      system: RECIPE_SYSTEM_PROMPT,
      prompt: buildRecipePrompt(parsed.data.message, parsed.data.draft),
      temperature: 0.3,
      repairText: repairJson,
    });

    return result.toTextStreamResponse();
  } catch (error) {
    console.error('[kaihuo] recipe draft failed', error);
    return c.json({ error: '生成失败，请稍后重试' }, 502);
  }
});
