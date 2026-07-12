import { integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';

export const activities = sqliteTable('activities', {
  stravaActivityId: integer('strava_activity_id', { mode: 'number' }).primaryKey(),
  distanceMeters: integer('distance_meters').notNull(),
  sportType: text('sport_type').notNull(),
  startDate: text('start_date').notNull(),
  updatedAt: text('updated_at').notNull()
});

export const authTokens = sqliteTable('auth_tokens', {
  athleteId: integer('athlete_id', { mode: 'number' }).primaryKey(),
  accessToken: text('access_token').notNull(),
  refreshToken: text('refresh_token').notNull(),
  expiresAt: integer('expires_at', { mode: 'timestamp' }).notNull(),
  updatedAt: text('updated_at').notNull()
});

export type Activity = typeof activities.$inferSelect;
export type NewActivity = typeof activities.$inferInsert;
export type AuthToken = typeof authTokens.$inferSelect;
export type NewAuthToken = typeof authTokens.$inferInsert;
