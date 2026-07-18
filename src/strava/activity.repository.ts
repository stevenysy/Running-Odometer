import { eq, gte } from 'drizzle-orm';
import type { DbClient } from '@/db/client';
import { activities, type Activity, type NewActivity } from '@/db/schema';

export interface ActivityRepository {
  upsertActivity(activity: NewActivity): Promise<void>;
  deleteActivity(stravaActivityId: number): Promise<boolean>;
  listActivityIdsSince(startDate: string): Promise<number[]>;
}

export function createActivityRepository(db: DbClient): ActivityRepository {
  return {
    async upsertActivity(activity) {
      await db
        .insert(activities)
        .values(activity)
        .onConflictDoUpdate({
          target: activities.stravaActivityId,
          set: {
            distanceMeters: activity.distanceMeters,
            sportType: activity.sportType,
            startDate: activity.startDate,
            name: activity.name,
            movingTimeSeconds: activity.movingTimeSeconds,
            elapsedTimeSeconds: activity.elapsedTimeSeconds,
            elevationGainMeters: activity.elevationGainMeters,
            startDateLocal: activity.startDateLocal,
            timezone: activity.timezone,
            averageSpeedMetersPerSecond: activity.averageSpeedMetersPerSecond,
            maxSpeedMetersPerSecond: activity.maxSpeedMetersPerSecond,
            averageHeartrate: activity.averageHeartrate,
            maxHeartrate: activity.maxHeartrate,
            updatedAt: activity.updatedAt
          }
        });
    },
    async deleteActivity(stravaActivityId) {
      const existingActivity = await findActivity(db, stravaActivityId);

      if (!existingActivity) {
        return false;
      }

      await db.delete(activities).where(eq(activities.stravaActivityId, stravaActivityId));

      return true;
    },
    async listActivityIdsSince(startDate) {
      const rows = await db
        .select({
          stravaActivityId: activities.stravaActivityId
        })
        .from(activities)
        .where(gte(activities.startDate, startDate));

      return rows.map((row) => row.stravaActivityId);
    }
  };
}

async function findActivity(db: DbClient, stravaActivityId: number): Promise<Activity | null> {
  const activity = await db.query.activities.findFirst({
    where: eq(activities.stravaActivityId, stravaActivityId)
  });

  return activity ?? null;
}
