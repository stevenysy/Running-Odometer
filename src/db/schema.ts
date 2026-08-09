import { integer, real, sqliteTable, text } from 'drizzle-orm/sqlite-core';

export const activities = sqliteTable('activities', {
  stravaActivityId: integer('strava_activity_id', { mode: 'number' }).primaryKey(),
  distanceMeters: integer('distance_meters').notNull(),
  sportType: text('sport_type').notNull(),
  startDate: text('start_date').notNull(),
  name: text('name'),
  movingTimeSeconds: integer('moving_time_seconds'),
  elapsedTimeSeconds: integer('elapsed_time_seconds'),
  elevationGainMeters: real('elevation_gain_meters'),
  startDateLocal: text('start_date_local'),
  timezone: text('timezone'),
  averageSpeedMetersPerSecond: real('average_speed_meters_per_second'),
  maxSpeedMetersPerSecond: real('max_speed_meters_per_second'),
  averageHeartrate: real('average_heartrate'),
  maxHeartrate: real('max_heartrate'),
  summaryPolyline: text('summary_polyline'),
  updatedAt: text('updated_at').notNull()
});

export const authTokens = sqliteTable('auth_tokens', {
  athleteId: integer('athlete_id', { mode: 'number' }).primaryKey(),
  accessToken: text('access_token').notNull(),
  refreshToken: text('refresh_token').notNull(),
  expiresAt: integer('expires_at', { mode: 'timestamp' }).notNull(),
  updatedAt: text('updated_at').notNull()
});

export const displayConfig = sqliteTable('display_config', {
  id: text('id').primaryKey(),
  nextRaceName: text('next_race_name'),
  nextRaceDate: text('next_race_date'),
  updatedAt: text('updated_at').notNull()
});

export type Activity = typeof activities.$inferSelect;
export type NewActivity = typeof activities.$inferInsert;
export type AuthToken = typeof authTokens.$inferSelect;
export type NewAuthToken = typeof authTokens.$inferInsert;
export type DisplayConfig = typeof displayConfig.$inferSelect;
export type NewDisplayConfig = typeof displayConfig.$inferInsert;
