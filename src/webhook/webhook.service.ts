import type { AuthService } from '@/auth/auth.service';
import type { ActivityRepository } from '@/strava/activity.repository';
import { isRunActivity, toStoredActivity } from '@/strava/activity.mapper';
import type { StravaClient } from '@/strava/strava.client';

export interface StravaWebhookEvent {
  objectType: 'activity' | 'athlete';
  objectId: number;
  aspectType: 'create' | 'update' | 'delete';
  ownerId: number;
  subscriptionId: number;
  eventTime: number;
  updates?: Record<string, string>;
}

export interface WebhookService {
  processEvent(event: StravaWebhookEvent): Promise<void>;
}

export function createWebhookService(
  authService: AuthService,
  stravaClient: StravaClient,
  activityRepository: ActivityRepository
): WebhookService {
  return {
    async processEvent(event) {
      if (event.objectType !== 'activity') {
        return;
      }

      if (event.aspectType === 'delete') {
        await activityRepository.deleteActivity(event.objectId);
        return;
      }

      const token = await authService.getValidToken(event.ownerId);

      if (!token) {
        console.warn(`No Strava token found for webhook owner ${event.ownerId.toString()}`);
        return;
      }

      const activity = await stravaClient.getActivity({
        accessToken: token.accessToken,
        activityId: event.objectId
      });

      if (isRunActivity(activity)) {
        await activityRepository.upsertActivity(toStoredActivity(activity));
      } else {
        await activityRepository.deleteActivity(activity.id);
      }
    }
  };
}
