import { Hono } from 'hono';
import { HTTPException } from 'hono/http-exception';
import { createAuthTokenRepository } from '@/auth/auth.repository';
import { createAuthService } from '@/auth/auth.service';
import { createDb } from '@/db/client';
import { requireApiKey } from '@/middleware/require-api-key';
import type { AppContext } from '@/routes/app';
import { createActivityRepository } from './activity.repository';
import { createStravaClient, StravaApiError } from './strava.client';
import { createSyncService } from './sync.service';

export const syncRoutes = new Hono<AppContext>();

syncRoutes.post('/strava', requireApiKey, async (c) => {
  const db = createDb(c.env.DB);
  const stravaClient = createStravaClient({
    clientId: c.env.STRAVA_CLIENT_ID,
    clientSecret: c.env.STRAVA_CLIENT_SECRET
  });
  const authService = createAuthService(createAuthTokenRepository(db), stravaClient);
  const syncService = createSyncService(stravaClient, createActivityRepository(db));

  try {
    const token = await authService.getValidToken();

    if (!token) {
      throw new HTTPException(401, { message: 'Strava OAuth has not been completed' });
    }

    const result = await syncService.syncAllActivities(token);

    return c.json(result);
  } catch (error) {
    if (error instanceof StravaApiError) {
      throw new HTTPException(502, { message: 'Unable to sync Strava activities' });
    }

    throw error;
  }
});
