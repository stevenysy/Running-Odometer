import type { AuthToken } from '@/db/schema';
import { nowIso } from '@/lib/time';
import type { StravaClient, StravaSummaryActivity } from './strava.client';
import type { ActivityRepository } from './activity.repository';

const STRAVA_SYNC_PER_PAGE = 200;

export interface SyncService {
  syncAllActivities(token: AuthToken): Promise<SyncResult>;
}

export interface SyncResult {
  ok: true;
  pagesFetched: number;
  activitiesSeen: number;
  activitiesUpserted: number;
  activitiesDeleted: number;
  activitiesIgnored: number;
}

export function createSyncService(
  stravaClient: StravaClient,
  activityRepository: ActivityRepository
): SyncService {
  return {
    async syncAllActivities(token) {
      let page = 1;
      let pagesFetched = 0;
      let activitiesSeen = 0;
      let activitiesUpserted = 0;
      let activitiesDeleted = 0;
      let activitiesIgnored = 0;
      let hasMorePages = true;

      while (hasMorePages) {
        const stravaActivities = await stravaClient.listAthleteActivities({
          accessToken: token.accessToken,
          page,
          perPage: STRAVA_SYNC_PER_PAGE
        });

        pagesFetched += 1;
        activitiesSeen += stravaActivities.length;

        for (const activity of stravaActivities) {
          if (isRunActivity(activity)) {
            await activityRepository.upsertActivity({
              stravaActivityId: activity.id,
              distanceMeters: Math.round(activity.distance),
              sportType: activity.sport_type,
              startDate: activity.start_date,
              updatedAt: nowIso()
            });
            activitiesUpserted += 1;
          } else {
            const wasDeleted = await activityRepository.deleteActivity(activity.id);

            if (wasDeleted) {
              activitiesDeleted += 1;
            }

            activitiesIgnored += 1;
          }
        }

        if (stravaActivities.length < STRAVA_SYNC_PER_PAGE) {
          hasMorePages = false;
        } else {
          page += 1;
        }
      }

      return {
        ok: true,
        pagesFetched,
        activitiesSeen,
        activitiesUpserted,
        activitiesDeleted,
        activitiesIgnored
      };
    }
  };
}

function isRunActivity(activity: StravaSummaryActivity): boolean {
  return activity.sport_type === 'Run' || activity.sport_type.endsWith('Run');
}
