import { Hono } from 'hono';

export const app = new Hono();

app.get('/api/health', (c) =>
  c.json({
    ok: true,
    app: 'kaihuo',
    version: '0.1.0',
    now: Date.now(),
  }),
);
