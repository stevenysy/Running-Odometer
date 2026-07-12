import { eq } from 'drizzle-orm';
import type { DbClient } from '@/db/client';
import { activities, type Activity, type NewActivity } from '@/db/schema';

export interface ActivityRepository {
  upsertActivity(activity: NewActivity): Promise<void>;
  deleteActivity(stravaActivityId: number): Promise<boolean>;
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
    }
  };
}

async function findActivity(db: DbClient, stravaActivityId: number): Promise<Activity | null> {
  const activity = await db.query.activities.findFirst({
    where: eq(activities.stravaActivityId, stravaActivityId)
  });

  return activity ?? null;
}
