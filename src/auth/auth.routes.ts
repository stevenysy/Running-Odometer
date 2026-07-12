import { Hono } from 'hono';
import type { AppContext } from '@/routes/app';

export const authRoutes = new Hono<AppContext>();

authRoutes.get('/strava', (c) => {
  return c.json({ error: 'Strava OAuth login is not implemented yet' }, 501);
});

authRoutes.get('/strava/callback', (c) => {
  return c.json({ error: 'Strava OAuth callback is not implemented yet' }, 501);
});
