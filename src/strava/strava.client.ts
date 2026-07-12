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

const stravaSummaryActivitySchema = z.object({
  id: z.number().int().positive(),
  distance: z.number().nonnegative(),
  sport_type: z.string().min(1),
  start_date: z.string().min(1)
});

const stravaSummaryActivitiesSchema = z.array(stravaSummaryActivitySchema);

export type StravaTokenResponse = z.infer<typeof stravaTokenResponseSchema>;
export type StravaSummaryActivity = z.infer<typeof stravaSummaryActivitySchema>;

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

export interface ListAthleteActivitiesInput {
  accessToken: string;
  page: number;
  perPage: number;
}

export interface GetActivityInput {
  accessToken: string;
  activityId: number;
}

export interface StravaClient {
  exchangeAuthorizationCode(input: ExchangeAuthorizationCodeInput): Promise<StravaTokenResponse>;
  refreshAccessToken(input: RefreshAccessTokenInput): Promise<StravaTokenResponse>;
  listAthleteActivities(input: ListAthleteActivitiesInput): Promise<StravaSummaryActivity[]>;
  getActivity(input: GetActivityInput): Promise<StravaSummaryActivity>;
}

const STRAVA_TOKEN_URL = 'https://www.strava.com/oauth/token';
const STRAVA_API_BASE_URL = 'https://www.strava.com/api/v3';

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
    },
    listAthleteActivities(input) {
      return requestStravaApi(
        `/athlete/activities?page=${input.page.toString()}&per_page=${input.perPage.toString()}`,
        input.accessToken,
        stravaSummaryActivitiesSchema
      );
    },
    getActivity(input) {
      return requestStravaApi(
        `/activities/${input.activityId.toString()}?include_all_efforts=false`,
        input.accessToken,
        stravaSummaryActivitySchema
      );
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

  const payload = await readJsonPayload(response, 'Strava token response was not JSON');

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

async function requestStravaApi<T>(
  path: string,
  accessToken: string,
  schema: z.ZodSchema<T>
): Promise<T> {
  const response = await fetch(`${STRAVA_API_BASE_URL}${path}`, {
    headers: {
      Authorization: `Bearer ${accessToken}`
    }
  });

  const payload = await readJsonPayload(response, 'Strava API response was not JSON');

  if (!response.ok) {
    throw new StravaApiError('Strava API request failed', response.status, payload);
  }

  const parsed = schema.safeParse(payload);

  if (!parsed.success) {
    throw new StravaApiError(
      'Strava API response was invalid',
      response.status,
      parsed.error.flatten()
    );
  }

  return parsed.data;
}

async function readJsonPayload(response: Response, message: string): Promise<unknown> {
  try {
    return await response.json();
  } catch {
    throw new StravaApiError(message, response.status, null);
  }
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
