import { Hono } from 'hono';
import type { AppContext } from '@/routes/app';

export const odometerRoutes = new Hono<AppContext>();

odometerRoutes.get('/odometer', (c) => {
  return c.json({ error: 'Odometer endpoint is not implemented yet' }, 501);
});
