import { z } from 'zod';

const stravaTokenResponseSchema = z.object({
  access_token: z.string().min(1),
  refresh_token: z.string().min(1),
  expires_at: z.number().int().positive(),
  expires_in: z.number().int().nonnegative(),
  athlete: z.object({
    id: z.number().int().positive()
  })
});

export type StravaTokenResponse = z.infer<typeof stravaTokenResponseSchema>;

export interface StravaClientConfig {
  clientId: string;
  clientSecret: string;
}

export interface ExchangeAuthorizationCodeInput {
  code: string;
}

export interface RefreshAccessTokenInput {
  refreshToken: string;
}

export interface StravaClient {
  exchangeAuthorizationCode(input: ExchangeAuthorizationCodeInput): Promise<StravaTokenResponse>;
  refreshAccessToken(input: RefreshAccessTokenInput): Promise<StravaTokenResponse>;
}

const STRAVA_TOKEN_URL = 'https://www.strava.com/oauth/token';

export function createStravaClient(config: StravaClientConfig): StravaClient {
  return {
    exchangeAuthorizationCode(input) {
      return requestToken({
        clientId: config.clientId,
        clientSecret: config.clientSecret,
        grantType: 'authorization_code',
        code: input.code
      });
    },
    refreshAccessToken(input) {
      return requestToken({
        clientId: config.clientId,
        clientSecret: config.clientSecret,
        grantType: 'refresh_token',
        refreshToken: input.refreshToken
      });
    }
  };
}

type TokenRequest =
  | {
      clientId: string;
      clientSecret: string;
      grantType: 'authorization_code';
      code: string;
    }
  | {
      clientId: string;
      clientSecret: string;
      grantType: 'refresh_token';
      refreshToken: string;
    };

async function requestToken(request: TokenRequest): Promise<StravaTokenResponse> {
  const body = new URLSearchParams({
    client_id: request.clientId,
    client_secret: request.clientSecret,
    grant_type: request.grantType
  });

  if (request.grantType === 'authorization_code') {
    body.set('code', request.code);
  } else {
    body.set('refresh_token', request.refreshToken);
  }

  const response = await fetch(STRAVA_TOKEN_URL, {
    method: 'POST',
    body
  });

  const payload: unknown = await response.json();

  if (!response.ok) {
    throw new StravaApiError('Strava token request failed', response.status, payload);
  }

  const parsed = stravaTokenResponseSchema.safeParse(payload);

  if (!parsed.success) {
    throw new StravaApiError(
      'Strava token response was invalid',
      response.status,
      parsed.error.flatten()
    );
  }

  return parsed.data;
}

export class StravaApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly details: unknown
  ) {
    super(message);
    this.name = 'StravaApiError';
  }
}
