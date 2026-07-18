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
    name: activity.name ?? null,
    movingTimeSeconds: activity.moving_time ?? null,
    elapsedTimeSeconds: activity.elapsed_time ?? null,
    elevationGainMeters: activity.total_elevation_gain ?? null,
    startDateLocal: activity.start_date_local ?? null,
    timezone: activity.timezone ?? null,
    averageSpeedMetersPerSecond: activity.average_speed ?? null,
    maxSpeedMetersPerSecond: activity.max_speed ?? null,
    averageHeartrate: activity.average_heartrate ?? null,
    maxHeartrate: activity.max_heartrate ?? null,
    updatedAt: nowIso()
  };
}
