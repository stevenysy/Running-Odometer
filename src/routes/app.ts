import { Hono } from 'hono';
import { HTTPException } from 'hono/http-exception';
import type { Bindings, AppVariables } from '@/types/env';
import { authRoutes } from '@/auth/auth.routes';
import { odometerRoutes } from '@/odometer/odometer.routes';
import { syncRoutes } from '@/strava/sync.routes';
import { webhookRoutes } from '@/webhook/webhook.routes';

export type AppContext = {
  Bindings: Bindings;
  Variables: AppVariables;
};

export function createApp(): Hono<AppContext> {
  const app = new Hono<AppContext>();

  app.get('/health', (c) => c.json({ ok: true }));

  app.route('/auth', authRoutes);
  app.route('/webhook', webhookRoutes);
  app.route('/api', odometerRoutes);
  app.route('/api/sync', syncRoutes);

  app.notFound((c) => c.json({ error: 'Not found' }, 404));

  app.onError((error, c) => {
    if (error instanceof HTTPException) {
      return error.getResponse();
    }

    console.error(error);
    return c.json({ error: 'Internal server error' }, 500);
  });

  return app;
}
