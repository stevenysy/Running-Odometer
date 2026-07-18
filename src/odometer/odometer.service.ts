import type { OdometerRepository } from './odometer.repository';

export interface OdometerService {
  getOdometer(): Promise<OdometerResponse>;
}

export interface OdometerResponse {
  distanceMeters: number;
  distanceKm: number;
  lastUpdated: string | null;
  activityCount: number;
  movingTimeSeconds: number;
  elapsedTimeSeconds: number;
  elevationGainMeters: number;
  averagePaceSecondsPerKm: number | null;
  averageSpeedMetersPerSecond: number | null;
  latestActivity: LatestActivityResponse | null;
  recent: RecentOdometerResponse;
}

export interface LatestActivityResponse {
  id: number;
  name: string | null;
  distanceMeters: number;
  distanceKm: number;
  movingTimeSeconds: number | null;
  elapsedTimeSeconds: number | null;
  elevationGainMeters: number | null;
  averagePaceSecondsPerKm: number | null;
  averageSpeedMetersPerSecond: number | null;
  startDate: string;
  startDateLocal: string | null;
  sportType: string;
}

export interface RecentOdometerResponse {
  last7DaysDistanceMeters: number;
  last7DaysDistanceKm: number;
  last7DaysActivityCount: number;
  last30DaysDistanceMeters: number;
  last30DaysDistanceKm: number;
  last30DaysActivityCount: number;
}

export function createOdometerService(repository: OdometerRepository): OdometerService {
  return {
    async getOdometer() {
      const totals = await repository.getTotals();

      return {
        distanceMeters: totals.distanceMeters,
        distanceKm: totals.distanceMeters / 1000,
        lastUpdated: totals.lastUpdated,
        activityCount: totals.activityCount,
        movingTimeSeconds: totals.movingTimeSeconds,
        elapsedTimeSeconds: totals.elapsedTimeSeconds,
        elevationGainMeters: totals.elevationGainMeters,
        averagePaceSecondsPerKm: calculatePaceSecondsPerKm(
          totals.movingTimeSeconds,
          totals.distanceMeters
        ),
        averageSpeedMetersPerSecond: calculateSpeedMetersPerSecond(
          totals.distanceMeters,
          totals.movingTimeSeconds
        ),
        latestActivity: totals.latestActivity
          ? {
              id: totals.latestActivity.stravaActivityId,
              name: totals.latestActivity.name,
              distanceMeters: totals.latestActivity.distanceMeters,
              distanceKm: totals.latestActivity.distanceMeters / 1000,
              movingTimeSeconds: totals.latestActivity.movingTimeSeconds,
              elapsedTimeSeconds: totals.latestActivity.elapsedTimeSeconds,
              elevationGainMeters: totals.latestActivity.elevationGainMeters,
              averagePaceSecondsPerKm: calculatePaceSecondsPerKm(
                totals.latestActivity.movingTimeSeconds,
                totals.latestActivity.distanceMeters
              ),
              averageSpeedMetersPerSecond: totals.latestActivity.averageSpeedMetersPerSecond,
              startDate: totals.latestActivity.startDate,
              startDateLocal: totals.latestActivity.startDateLocal,
              sportType: totals.latestActivity.sportType
            }
          : null,
        recent: {
          last7DaysDistanceMeters: totals.recent.last7DaysDistanceMeters,
          last7DaysDistanceKm: totals.recent.last7DaysDistanceMeters / 1000,
          last7DaysActivityCount: totals.recent.last7DaysActivityCount,
          last30DaysDistanceMeters: totals.recent.last30DaysDistanceMeters,
          last30DaysDistanceKm: totals.recent.last30DaysDistanceMeters / 1000,
          last30DaysActivityCount: totals.recent.last30DaysActivityCount
        }
      };
    }
  };
}

function calculatePaceSecondsPerKm(
  movingTimeSeconds: number | null,
  distanceMeters: number
): number | null {
  if (movingTimeSeconds === null || movingTimeSeconds === 0 || distanceMeters === 0) {
    return null;
  }

  return movingTimeSeconds / (distanceMeters / 1000);
}

function calculateSpeedMetersPerSecond(
  distanceMeters: number,
  movingTimeSeconds: number
): number | null {
  if (movingTimeSeconds === 0) {
    return null;
  }

  return distanceMeters / movingTimeSeconds;
}
