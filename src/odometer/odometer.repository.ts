import { max, sum } from 'drizzle-orm';
import type { DbClient } from '@/db/client';
import { activities } from '@/db/schema';

export interface OdometerRepository {
  getTotals(): Promise<OdometerTotals>;
}

export interface OdometerTotals {
  distanceMeters: number;
  lastUpdated: string | null;
}

export function createOdometerRepository(db: DbClient): OdometerRepository {
  return {
    async getTotals() {
      const [totals] = await db
        .select({
          distanceMeters: sum(activities.distanceMeters),
          lastUpdated: max(activities.updatedAt)
        })
        .from(activities);

      return {
        distanceMeters: parseAggregateNumber(totals?.distanceMeters),
        lastUpdated: totals?.lastUpdated ?? null
      };
    }
  };
}

function parseAggregateNumber(value: string | number | null | undefined): number {
  if (value === null || value === undefined) {
    return 0;
  }

  if (typeof value === 'number') {
    return value;
  }

  return Number(value);
}
