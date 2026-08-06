import { eq } from 'drizzle-orm';
import type { DbClient } from '@/db/client';
import { displayConfig, type DisplayConfig } from '@/db/schema';

export const DISPLAY_CONFIG_ID = 'default';

export interface DisplayConfigRepository {
  getConfig(): Promise<DisplayConfig | null>;
  upsertConfig(input: DisplayConfigInput): Promise<DisplayConfig>;
}

export interface DisplayConfigInput {
  nextRaceName: string | null;
  nextRaceDate: string | null;
  updatedAt: string;
}

export function createDisplayConfigRepository(db: DbClient): DisplayConfigRepository {
  return {
    async getConfig() {
      const [config] = await db
        .select()
        .from(displayConfig)
        .where(eq(displayConfig.id, DISPLAY_CONFIG_ID))
        .limit(1);

      return config ?? null;
    },

    async upsertConfig(input) {
      const [config] = await db
        .insert(displayConfig)
        .values({
          id: DISPLAY_CONFIG_ID,
          nextRaceName: input.nextRaceName,
          nextRaceDate: input.nextRaceDate,
          updatedAt: input.updatedAt
        })
        .onConflictDoUpdate({
          target: displayConfig.id,
          set: {
            nextRaceName: input.nextRaceName,
            nextRaceDate: input.nextRaceDate,
            updatedAt: input.updatedAt
          }
        })
        .returning();

      if (!config) {
        throw new Error('Unable to save display config');
      }

      return config;
    }
  };
}
