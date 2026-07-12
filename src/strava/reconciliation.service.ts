import type { AuthService } from '@/auth/auth.service';
import { isRunActivity, toStoredActivity } from './activity.mapper';
import type { ActivityRepository } from './activity.repository';
import type { StravaClient } from './strava.client';

const RECONCILIATION_WINDOW_DAYS = 14;
const STRAVA_RECONCILIATION_PER_PAGE = 200;

export interface ReconciliationService {
  reconcileRecentActivities(now?: Date): Promise<ReconciliationResult>;
}

export interface ReconciliationResult {
  ok: true;
  skipped: boolean;
  pagesFetched: number;
  activitiesSeen: number;
  activitiesUpserted: number;
  activitiesDeleted: number;
  activitiesIgnored: number;
}

export function createReconciliationService(
  authService: AuthService,
  stravaClient: StravaClient,
  activityRepository: ActivityRepository
): ReconciliationService {
  return {
    async reconcileRecentActivities(now = new Date()) {
      const token = await authService.getValidToken();

      if (!token) {
        return emptyResult(true);
      }

      const cutoffDate = getReconciliationCutoff(now);
      const cutoffEpochSeconds = Math.floor(cutoffDate.getTime() / 1000);
      const storedActivityIds = await activityRepository.listActivityIdsSince(
        cutoffDate.toISOString()
      );
      const fetchedRunActivityIds = new Set<number>();
      let page = 1;
      let pagesFetched = 0;
      let activitiesSeen = 0;
      let activitiesUpserted = 0;
      let activitiesIgnored = 0;
      let hasMorePages = true;

      while (hasMorePages) {
        const stravaActivities = await stravaClient.listAthleteActivities({
          accessToken: token.accessToken,
          page,
          perPage: STRAVA_RECONCILIATION_PER_PAGE,
          after: cutoffEpochSeconds
        });

        pagesFetched += 1;
        activitiesSeen += stravaActivities.length;

        for (const activity of stravaActivities) {
          if (isRunActivity(activity)) {
            fetchedRunActivityIds.add(activity.id);
            await activityRepository.upsertActivity(toStoredActivity(activity));
            activitiesUpserted += 1;
          } else {
            activitiesIgnored += 1;
          }
        }

        if (stravaActivities.length < STRAVA_RECONCILIATION_PER_PAGE) {
          hasMorePages = false;
        } else {
          page += 1;
        }
      }

      let activitiesDeleted = 0;

      for (const storedActivityId of storedActivityIds) {
        if (!fetchedRunActivityIds.has(storedActivityId)) {
          const wasDeleted = await activityRepository.deleteActivity(storedActivityId);

          if (wasDeleted) {
            activitiesDeleted += 1;
          }
        }
      }

      return {
        ok: true,
        skipped: false,
        pagesFetched,
        activitiesSeen,
        activitiesUpserted,
        activitiesDeleted,
        activitiesIgnored
      };
    }
  };
}

function emptyResult(skipped: boolean): ReconciliationResult {
  return {
    ok: true,
    skipped,
    pagesFetched: 0,
    activitiesSeen: 0,
    activitiesUpserted: 0,
    activitiesDeleted: 0,
    activitiesIgnored: 0
  };
}

function getReconciliationCutoff(now: Date): Date {
  return new Date(now.getTime() - RECONCILIATION_WINDOW_DAYS * 24 * 60 * 60 * 1000);
}
