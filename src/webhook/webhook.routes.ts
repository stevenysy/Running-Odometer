import { Hono } from 'hono';
import type { AppContext } from '@/routes/app';

export const webhookRoutes = new Hono<AppContext>();

webhookRoutes.get('/strava', (c) => {
  return c.json({ error: 'Strava webhook verification is not implemented yet' }, 501);
});

webhookRoutes.post('/strava', (c) => {
  return c.json({ error: 'Strava webhook handler is not implemented yet' }, 501);
});
