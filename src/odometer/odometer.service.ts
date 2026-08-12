import {
  DEFAULT_TIMEZONE_OFFSET_MINUTES,
  toNextRaceResponse,
  type NextRaceResponse
} from '@/display-config/display-config.service';
import type { DisplayConfigRepository } from '@/display-config/display-config.repository';
import type { OdometerRepository } from './odometer.repository';
import { createRoutePreview, type RoutePreview } from './route-preview';

export interface OdometerService {
  getOdometer(): Promise<OdometerResponse>;
}

export interface OdometerResponse {
  distanceMeters: number;
  distanceKm: number;
  lastUpdated: string | null;
  generatedAt: string;
  timezoneOffsetMinutes: number;
  activityCount: number;
  movingTimeSeconds: number;
  elapsedTimeSeconds: number;
  elevationGainMeters: number;
  averagePaceSecondsPerKm: number | null;
  averageSpeedMetersPerSecond: number | null;
  latestActivity: LatestActivityResponse | null;
  longestActivity: LongestActivityResponse | null;
  recent: RecentOdometerResponse;
  yearToDate: YearToDateOdometerResponse;
  nextRace: NextRaceResponse | null;
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
  summaryPolyline: string | null;
  routePreview: RoutePreview | null;
}

export interface LongestActivityResponse {
  id: number;
  name: string | null;
  distanceMeters: number;
  distanceKm: number;
  startDate: string;
  startDateLocal: string | null;
}

export interface RecentOdometerResponse {
  last7DaysDistanceMeters: number;
  last7DaysDistanceKm: number;
  last7DaysActivityCount: number;
  last30DaysDistanceMeters: number;
  last30DaysDistanceKm: number;
  last30DaysActivityCount: number;
}

export interface YearToDateOdometerResponse {
  distanceMeters: number;
  distanceKm: number;
  activityCount: number;
}

export function createOdometerService(
  repository: OdometerRepository,
  displayConfigRepository: DisplayConfigRepository
): OdometerService {
  return {
    async getOdometer() {
      const generatedAt = new Date().toISOString();
      const [totals, displayConfig] = await Promise.all([
        repository.getTotals(),
        displayConfigRepository.getConfig()
      ]);

      return {
        distanceMeters: totals.distanceMeters,
        distanceKm: totals.distanceMeters / 1000,
        lastUpdated: totals.lastUpdated,
        generatedAt,
        timezoneOffsetMinutes:
          displayConfig?.timezoneOffsetMinutes ?? DEFAULT_TIMEZONE_OFFSET_MINUTES,
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
              sportType: totals.latestActivity.sportType,
              summaryPolyline: totals.latestActivity.summaryPolyline,
              routePreview: createRoutePreview(totals.latestActivity.summaryPolyline)
            }
          : null,
        longestActivity: totals.longestActivity
          ? {
              id: totals.longestActivity.stravaActivityId,
              name: totals.longestActivity.name,
              distanceMeters: totals.longestActivity.distanceMeters,
              distanceKm: totals.longestActivity.distanceMeters / 1000,
              startDate: totals.longestActivity.startDate,
              startDateLocal: totals.longestActivity.startDateLocal
            }
          : null,
        recent: {
          last7DaysDistanceMeters: totals.recent.last7DaysDistanceMeters,
          last7DaysDistanceKm: totals.recent.last7DaysDistanceMeters / 1000,
          last7DaysActivityCount: totals.recent.last7DaysActivityCount,
          last30DaysDistanceMeters: totals.recent.last30DaysDistanceMeters,
          last30DaysDistanceKm: totals.recent.last30DaysDistanceMeters / 1000,
          last30DaysActivityCount: totals.recent.last30DaysActivityCount
        },
        yearToDate: {
          distanceMeters: totals.yearToDate.distanceMeters,
          distanceKm: totals.yearToDate.distanceMeters / 1000,
          activityCount: totals.yearToDate.activityCount
        },
        nextRace: toNextRaceResponse(
          displayConfig?.nextRaceName ?? null,
          displayConfig?.nextRaceDate ?? null
        )
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
