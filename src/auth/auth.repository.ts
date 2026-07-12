import { eq } from 'drizzle-orm';
import type { DbClient } from '@/db/client';
import { authTokens, type AuthToken, type NewAuthToken } from '@/db/schema';
import { nowIso } from '@/lib/time';

export interface AuthTokenRepository {
  upsertToken(token: StoredAuthTokenInput): Promise<void>;
  findByAthleteId(athleteId: number): Promise<AuthToken | null>;
  findPrimaryToken(): Promise<AuthToken | null>;
}

export interface StoredAuthTokenInput {
  athleteId: number;
  accessToken: string;
  refreshToken: string;
  expiresAt: Date;
}

export function createAuthTokenRepository(db: DbClient): AuthTokenRepository {
  return {
    async upsertToken(token) {
      const updatedAt = nowIso();
      const row: NewAuthToken = {
        athleteId: token.athleteId,
        accessToken: token.accessToken,
        refreshToken: token.refreshToken,
        expiresAt: token.expiresAt,
        updatedAt
      };

      await db
        .insert(authTokens)
        .values(row)
        .onConflictDoUpdate({
          target: authTokens.athleteId,
          set: {
            accessToken: token.accessToken,
            refreshToken: token.refreshToken,
            expiresAt: token.expiresAt,
            updatedAt
          }
        });
    },
    async findByAthleteId(athleteId) {
      const token = await db.query.authTokens.findFirst({
        where: eq(authTokens.athleteId, athleteId)
      });

      return token ?? null;
    },
    async findPrimaryToken() {
      const token = await db.query.authTokens.findFirst();

      return token ?? null;
    }
  };
}
