import type { AuthToken } from '@/db/schema';
import type { AuthTokenRepository } from './auth.repository';
import type {
  StravaClient,
  StravaRefreshTokenResponse,
  StravaTokenResponse
} from '@/strava/strava.client';

export interface AuthService {
  completeOAuth(code: string): Promise<AuthTokenResult>;
  getValidToken(athleteId?: number): Promise<AuthToken | null>;
}

export interface AuthTokenResult {
  athleteId: number;
  expiresAt: Date;
}

export function createAuthService(
  repository: AuthTokenRepository,
  stravaClient: StravaClient
): AuthService {
  return {
    async completeOAuth(code) {
      const tokenResponse = await stravaClient.exchangeAuthorizationCode({ code });
      await persistStravaToken(repository, tokenResponse);

      return {
        athleteId: tokenResponse.athlete.id,
        expiresAt: stravaExpiresAtToDate(tokenResponse.expires_at)
      };
    },
    async getValidToken(athleteId) {
      const existingToken =
        athleteId === undefined
          ? await repository.findPrimaryToken()
          : await repository.findByAthleteId(athleteId);

      if (!existingToken) {
        return null;
      }

      if (existingToken.expiresAt.getTime() > Date.now()) {
        return existingToken;
      }

      const refreshedToken = await stravaClient.refreshAccessToken({
        refreshToken: existingToken.refreshToken
      });
      await persistRefreshedStravaToken(repository, existingToken.athleteId, refreshedToken);

      return {
        athleteId: existingToken.athleteId,
        accessToken: refreshedToken.access_token,
        refreshToken: refreshedToken.refresh_token,
        expiresAt: stravaExpiresAtToDate(refreshedToken.expires_at),
        updatedAt: new Date().toISOString()
      };
    }
  };
}

async function persistStravaToken(
  repository: AuthTokenRepository,
  token: StravaTokenResponse
): Promise<void> {
  await repository.upsertToken({
    athleteId: token.athlete.id,
    accessToken: token.access_token,
    refreshToken: token.refresh_token,
    expiresAt: stravaExpiresAtToDate(token.expires_at)
  });
}

async function persistRefreshedStravaToken(
  repository: AuthTokenRepository,
  athleteId: number,
  token: StravaRefreshTokenResponse
): Promise<void> {
  await repository.upsertToken({
    athleteId,
    accessToken: token.access_token,
    refreshToken: token.refresh_token,
    expiresAt: stravaExpiresAtToDate(token.expires_at)
  });
}

function stravaExpiresAtToDate(expiresAtSeconds: number): Date {
  return new Date(expiresAtSeconds * 1000);
}
