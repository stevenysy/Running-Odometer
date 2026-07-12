import { Hono } from 'hono';
import { HTTPException } from 'hono/http-exception';
import { z } from 'zod';
import { createAuthTokenRepository } from '@/auth/auth.repository';
import { createAuthService } from '@/auth/auth.service';
import { createDb } from '@/db/client';
import type { AppContext } from '@/routes/app';
import { createActivityRepository } from '@/strava/activity.repository';
import { createStravaClient } from '@/strava/strava.client';
import { createWebhookService, type StravaWebhookEvent } from './webhook.service';

export const webhookRoutes = new Hono<AppContext>();

const stravaWebhookVerificationQuerySchema = z.object({
  'hub.mode': z.literal('subscribe'),
  'hub.challenge': z.string().min(1),
  'hub.verify_token': z.string().min(1)
});

const stravaWebhookEventSchema = z.object({
  object_type: z.enum(['activity', 'athlete']),
  object_id: z.number().int().positive(),
  aspect_type: z.enum(['create', 'update', 'delete']),
  owner_id: z.number().int().positive(),
  subscription_id: z.number().int().positive(),
  event_time: z.number().int().positive(),
  updates: z.record(z.string()).optional()
});

webhookRoutes.get('/strava', (c) => {
  const parsedQuery = stravaWebhookVerificationQuerySchema.safeParse(c.req.query());

  if (!parsedQuery.success) {
    throw new HTTPException(400, { message: 'Invalid webhook verification query' });
  }

  if (parsedQuery.data['hub.verify_token'] !== c.env.STRAVA_VERIFY_TOKEN) {
    throw new HTTPException(403, { message: 'Invalid webhook verify token' });
  }

  return c.json({
    'hub.challenge': parsedQuery.data['hub.challenge']
  });
});

webhookRoutes.post('/strava', async (c) => {
  const payload = await readJsonBody(c.req);
  const parsedEvent = stravaWebhookEventSchema.safeParse(payload);

  if (!parsedEvent.success) {
    throw new HTTPException(400, { message: 'Invalid webhook event payload' });
  }

  const event = toWebhookEvent(parsedEvent.data);
  const db = createDb(c.env.DB);
  const stravaClient = createStravaClient({
    clientId: c.env.STRAVA_CLIENT_ID,
    clientSecret: c.env.STRAVA_CLIENT_SECRET
  });
  const webhookService = createWebhookService(
    createAuthService(createAuthTokenRepository(db), stravaClient),
    stravaClient,
    createActivityRepository(db)
  );

  c.executionCtx.waitUntil(
    webhookService.processEvent(event).catch((error: unknown) => {
      console.error('Failed to process Strava webhook event', error);
    })
  );

  return c.json({ ok: true });
});

async function readJsonBody(request: { json(): Promise<unknown> }): Promise<unknown> {
  try {
    return await request.json();
  } catch {
    throw new HTTPException(400, { message: 'Invalid JSON body' });
  }
}

function toWebhookEvent(event: z.infer<typeof stravaWebhookEventSchema>): StravaWebhookEvent {
  const webhookEvent: StravaWebhookEvent = {
    objectType: event.object_type,
    objectId: event.object_id,
    aspectType: event.aspect_type,
    ownerId: event.owner_id,
    subscriptionId: event.subscription_id,
    eventTime: event.event_time
  };

  if (event.updates !== undefined) {
    webhookEvent.updates = event.updates;
  }

  return webhookEvent;
}
