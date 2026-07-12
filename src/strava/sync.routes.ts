import { Hono } from 'hono';
import type { AppContext } from '@/routes/app';

export const syncRoutes = new Hono<AppContext>();

syncRoutes.post('/strava', (c) => {
  return c.json({ error: 'Manual Strava sync is not implemented yet' }, 501);
});
