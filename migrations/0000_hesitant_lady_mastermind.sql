CREATE TABLE `activities` (
	`strava_activity_id` integer PRIMARY KEY NOT NULL,
	`distance_meters` integer NOT NULL,
	`sport_type` text NOT NULL,
	`start_date` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `auth_tokens` (
	`athlete_id` integer PRIMARY KEY NOT NULL,
	`access_token` text NOT NULL,
	`refresh_token` text NOT NULL,
	`expires_at` integer NOT NULL,
	`updated_at` text NOT NULL
);
