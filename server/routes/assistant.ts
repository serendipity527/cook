import { Hono } from 'hono';
import { generateText } from 'ai';
import { createOpenAI } from '@ai-sdk/openai';
import { AssistantRequestSchema, type AssistantTurn } from '@shared/schema';
import { extractAssistantJson } from '../lib/assistant-json';
import { createRateLimiter } from '../lib/rate-limit';
import {
  ASSISTANT_SYSTEM_PROMPT,
  ASSISTANT_TEXT_CONTRACT,
  buildAssistantPrompt,
} from '../prompts/assistant';

export const assistantRoute = new Hono();

const limiter = createRateLimiter(20, 60_000);

assistantRoute.post('/', async (c) => {
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
  const parsed = AssistantRequestSchema.safeParse(body);

  if (!parsed.success) {
    return c.json({ error: '请求格式不正确' }, 400);
  }

  const sessionId = parsed.data.sessionId ?? globalThis.crypto.randomUUID();
  const provider = createOpenAI({
    apiKey,
    baseURL: process.env.AI_BASE_URL?.trim() || 'https://opencode.ai/inference/go/openai/v1',
    name: 'kaihuo',
    headers: {
      'User-Agent': 'kaihuo/0.1',
      Accept: 'application/json',
      'x-opencode-session': sessionId,
    },
  });
  const model = provider.chat(process.env.AI_MODEL?.trim() || 'deepseek-v4.1-flash');
  const system = `${ASSISTANT_SYSTEM_PROMPT}\n\n${ASSISTANT_TEXT_CONTRACT}`;
  const basePrompt = buildAssistantPrompt(parsed.data);

  const generate = (prompt: string) =>
    generateText({
      model,
      system,
      prompt,
      temperature: 0.4,
    }).then((result) => result.text);

  try {
    let text = await generate(basePrompt);
    let turn: AssistantTurn;

    try {
      turn = extractAssistantJson(text);
    } catch (firstError) {
      console.warn(
        '[kaihuo] first assistant turn did not validate, retrying',
        firstError instanceof Error ? firstError.message : firstError,
      );
      text = await generate(
        `${basePrompt}

上一次输出没有通过校验。请严格只输出一个 JSON 对象，字段完整：
- 如果只是问候或闲聊，intent 必须是 chat，draft 必须是 null；
- create_recipe / update_recipe 必须提供完整 draft；
- timed 步骤必须有 durationSec，judgment 步骤不能有 durationSec；
- 不要 Markdown，不要解释。`,
      );
      turn = extractAssistantJson(text);
    }

    const json = JSON.stringify(turn);
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        for (let index = 0; index < json.length; index += 80) {
          controller.enqueue(encoder.encode(json.slice(index, index + 80)));
          await new Promise((resolve) => setTimeout(resolve, 12));
        }
        controller.close();
      },
    });

    return new Response(stream, {
      headers: {
        'content-type': 'text/plain; charset=utf-8',
        'cache-control': 'no-store',
      },
    });
  } catch (error) {
    console.error('[kaihuo] assistant turn failed', error);
    return c.json({ error: '生成失败，请稍后重试' }, 502);
  }
});
