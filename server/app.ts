import { Hono } from 'hono';
import { assistantRoute } from './routes/assistant';

export const app = new Hono();

app.route('/api/assistant', assistantRoute);

app.get('/api/health', (c) =>
  c.json({
    ok: true,
    app: 'kaihuo',
    version: '0.1.0',
    now: Date.now(),
  }),
);
