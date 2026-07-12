import { Hono } from 'hono';
import { HTTPException } from 'hono/http-exception';
import { z } from 'zod';
import { createDb } from '@/db/client';
import type { AppContext } from '@/routes/app';
import { createStravaClient, StravaApiError } from '@/strava/strava.client';
import { createAuthTokenRepository } from './auth.repository';
import { createAuthService } from './auth.service';
import { createOAuthState, verifyOAuthState } from './oauth-state';

export const authRoutes = new Hono<AppContext>();

const stravaOAuthCallbackQuerySchema = z
  .object({
    code: z.string().min(1).optional(),
    scope: z.string().optional(),
    state: z.string().min(1).optional(),
    error: z.string().min(1).optional()
  })
  .refine(
    (query) => query.error !== undefined || (query.code !== undefined && query.state !== undefined),
    {
      message: 'Expected either an OAuth error or a code and state'
    }
  );

const STRAVA_AUTHORIZE_URL = 'https://www.strava.com/oauth/authorize';
const STRAVA_OAUTH_SCOPE = 'read,activity:read_all';

authRoutes.get('/strava', async (c) => {
  const callbackUrl = new URL('/auth/strava/callback', c.req.url);
  const state = await createOAuthState(c.env.STRAVA_CLIENT_SECRET);
  const authorizationUrl = new URL(STRAVA_AUTHORIZE_URL);

  authorizationUrl.search = new URLSearchParams({
    client_id: c.env.STRAVA_CLIENT_ID,
    redirect_uri: callbackUrl.toString(),
    response_type: 'code',
    approval_prompt: 'auto',
    scope: STRAVA_OAUTH_SCOPE,
    state
  }).toString();

  return c.redirect(authorizationUrl.toString(), 302);
});

authRoutes.get('/strava/callback', async (c) => {
  const parsedQuery = stravaOAuthCallbackQuerySchema.safeParse(c.req.query());

  if (!parsedQuery.success) {
    throw new HTTPException(400, { message: 'Invalid OAuth callback parameters' });
  }

  if (parsedQuery.data.error) {
    throw new HTTPException(400, { message: `Strava OAuth failed: ${parsedQuery.data.error}` });
  }

  const { code, state } = parsedQuery.data;

  if (!code || !state) {
    throw new HTTPException(400, { message: 'Missing OAuth code or state' });
  }

  const isValidState = await verifyOAuthState(state, c.env.STRAVA_CLIENT_SECRET);

  if (!isValidState) {
    throw new HTTPException(400, { message: 'Invalid OAuth state' });
  }

  const authService = createAuthService(
    createAuthTokenRepository(createDb(c.env.DB)),
    createStravaClient({
      clientId: c.env.STRAVA_CLIENT_ID,
      clientSecret: c.env.STRAVA_CLIENT_SECRET
    })
  );

  try {
    const result = await authService.completeOAuth(code);

    return c.json({
      ok: true,
      athleteId: result.athleteId,
      expiresAt: result.expiresAt.toISOString()
    });
  } catch (error) {
    if (error instanceof StravaApiError) {
      throw new HTTPException(502, { message: 'Unable to complete Strava OAuth token exchange' });
    }

    throw error;
  }
});
