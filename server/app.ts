import { Hono } from 'hono';
import { recipeRoute } from './routes/recipe';

export const app = new Hono();

app.route('/api/recipe', recipeRoute);

app.get('/api/health', (c) =>
  c.json({
    ok: true,
    app: 'kaihuo',
    version: '0.1.0',
    now: Date.now(),
  }),
);
