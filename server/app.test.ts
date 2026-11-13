import { afterEach, describe, expect, it } from 'vitest';
import { app } from './app';

afterEach(() => {
  delete process.env.AI_API_KEY;
});

describe('gateway', () => {
  it('responds to the health check', async () => {
    const response = await app.request('/api/health');
    expect(response.status).toBe(200);

    const body = (await response.json()) as { ok: boolean; app: string };
    expect(body.ok).toBe(true);
    expect(body.app).toBe('kaihuo');
  });

  it('reports a missing AI key instead of crashing', async () => {
    const response = await app.request('/api/assistant', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ message: '你好' }),
    });

    expect(response.status).toBe(503);
    const body = (await response.json()) as { error: string };
    expect(body.error).toContain('AI 未配置');
  });

  it('rejects an invalid assistant request before calling the model', async () => {
    process.env.AI_API_KEY = 'test-key';

    const response = await app.request('/api/assistant', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({}),
    });

    expect(response.status).toBe(400);
  });
});
