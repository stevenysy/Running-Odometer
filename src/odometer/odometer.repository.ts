import { count, desc, gte, max, sum } from 'drizzle-orm';
import type { DbClient } from '@/db/client';
import { activities, type Activity } from '@/db/schema';

export interface OdometerRepository {
  getTotals(now?: Date): Promise<OdometerTotals>;
}

export interface OdometerTotals {
  distanceMeters: number;
  activityCount: number;
  movingTimeSeconds: number;
  elapsedTimeSeconds: number;
  elevationGainMeters: number;
  lastUpdated: string | null;
  latestActivity: Activity | null;
  longestActivity: Activity | null;
  recent: RecentOdometerTotals;
  yearToDate: YearToDateOdometerTotals;
}

export interface RecentOdometerTotals {
  last7DaysDistanceMeters: number;
  last7DaysActivityCount: number;
  last30DaysDistanceMeters: number;
  last30DaysActivityCount: number;
}

export interface YearToDateOdometerTotals {
  distanceMeters: number;
  activityCount: number;
}

export function createOdometerRepository(db: DbClient): OdometerRepository {
  return {
    async getTotals(now = new Date()) {
      const [totals] = await db.select(createAggregateSelection()).from(activities);
      const [last7DaysTotals, last30DaysTotals, yearToDateTotals, latestActivity, longestActivity] =
        await Promise.all([
          getRecentTotals(db, daysAgo(now, 7)),
          getRecentTotals(db, daysAgo(now, 30)),
          getRecentTotals(db, startOfUtcYear(now)),
          getLatestActivity(db),
          getLongestActivity(db)
        ]);

      return {
        distanceMeters: parseAggregateNumber(totals?.distanceMeters),
        activityCount: parseAggregateNumber(totals?.activityCount),
        movingTimeSeconds: parseAggregateNumber(totals?.movingTimeSeconds),
        elapsedTimeSeconds: parseAggregateNumber(totals?.elapsedTimeSeconds),
        elevationGainMeters: parseAggregateNumber(totals?.elevationGainMeters),
        lastUpdated: totals?.lastUpdated ?? null,
        latestActivity,
        longestActivity,
        recent: {
          last7DaysDistanceMeters: last7DaysTotals.distanceMeters,
          last7DaysActivityCount: last7DaysTotals.activityCount,
          last30DaysDistanceMeters: last30DaysTotals.distanceMeters,
          last30DaysActivityCount: last30DaysTotals.activityCount
        },
        yearToDate: {
          distanceMeters: yearToDateTotals.distanceMeters,
          activityCount: yearToDateTotals.activityCount
        }
      };
    }
  };
}

function createAggregateSelection() {
  return {
    distanceMeters: sum(activities.distanceMeters),
    activityCount: count(activities.stravaActivityId),
    movingTimeSeconds: sum(activities.movingTimeSeconds),
    elapsedTimeSeconds: sum(activities.elapsedTimeSeconds),
    elevationGainMeters: sum(activities.elevationGainMeters),
    lastUpdated: max(activities.updatedAt)
  };
}

async function getRecentTotals(db: DbClient, startDate: Date): Promise<RecentTotals> {
  const [totals] = await db
    .select({
      distanceMeters: sum(activities.distanceMeters),
      activityCount: count(activities.stravaActivityId)
    })
    .from(activities)
    .where(gte(activities.startDate, startDate.toISOString()));

  return {
    distanceMeters: parseAggregateNumber(totals?.distanceMeters),
    activityCount: parseAggregateNumber(totals?.activityCount)
  };
}

async function getLatestActivity(db: DbClient): Promise<Activity | null> {
  const [activity] = await db
    .select()
    .from(activities)
    .orderBy(desc(activities.startDate))
    .limit(1);

  return activity ?? null;
}

async function getLongestActivity(db: DbClient): Promise<Activity | null> {
  const [activity] = await db
    .select()
    .from(activities)
    .orderBy(desc(activities.distanceMeters))
    .limit(1);

  return activity ?? null;
}

interface RecentTotals {
  distanceMeters: number;
  activityCount: number;
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

function daysAgo(now: Date, days: number): Date {
  return new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
}

function startOfUtcYear(now: Date): Date {
  return new Date(Date.UTC(now.getUTCFullYear(), 0, 1));
}
