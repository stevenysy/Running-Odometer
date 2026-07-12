import { createAuthTokenRepository } from '@/auth/auth.repository';
import { createAuthService } from '@/auth/auth.service';
import { createDb } from '@/db/client';
import { createActivityRepository } from '@/strava/activity.repository';
import { createReconciliationService } from '@/strava/reconciliation.service';
import { createStravaClient } from '@/strava/strava.client';
import { createApp } from './routes/app';

const app = createApp();

export default {
  fetch: app.fetch,
  scheduled(_event, env, ctx) {
    ctx.waitUntil(runScheduledReconciliation(env));
  }
} satisfies ExportedHandler<Env>;

async function runScheduledReconciliation(env: Env): Promise<void> {
  try {
    const db = createDb(env.DB);
    const stravaClient = createStravaClient({
      clientId: env.STRAVA_CLIENT_ID,
      clientSecret: env.STRAVA_CLIENT_SECRET
    });
    const reconciliationService = createReconciliationService(
      createAuthService(createAuthTokenRepository(db), stravaClient),
      stravaClient,
      createActivityRepository(db)
    );
    const result = await reconciliationService.reconcileRecentActivities();

    console.log('Scheduled Strava reconciliation completed', result);
  } catch (error) {
    console.error('Scheduled Strava reconciliation failed', error);
  }
}
