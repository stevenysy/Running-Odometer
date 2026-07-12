import type { NewActivity } from '@/db/schema';
import { nowIso } from '@/lib/time';
import type { StravaSummaryActivity } from './strava.client';

export function isRunActivity(activity: StravaSummaryActivity): boolean {
  return activity.sport_type === 'Run' || activity.sport_type.endsWith('Run');
}

export function toStoredActivity(activity: StravaSummaryActivity): NewActivity {
  return {
    stravaActivityId: activity.id,
    distanceMeters: Math.round(activity.distance),
    sportType: activity.sport_type,
    startDate: activity.start_date,
    updatedAt: nowIso()
  };
}
