import { describe, expect, it } from 'vitest';
import { app } from './app';

describe('gateway', () => {
  it('responds to the health check', async () => {
    const response = await app.request('/api/health');
    expect(response.status).toBe(200);

    const body = (await response.json()) as { ok: boolean; app: string };
    expect(body.ok).toBe(true);
    expect(body.app).toBe('kaihuo');
  });
});
