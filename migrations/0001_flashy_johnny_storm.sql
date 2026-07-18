ALTER TABLE `activities` ADD `name` text;--> statement-breakpoint
ALTER TABLE `activities` ADD `moving_time_seconds` integer;--> statement-breakpoint
ALTER TABLE `activities` ADD `elapsed_time_seconds` integer;--> statement-breakpoint
ALTER TABLE `activities` ADD `elevation_gain_meters` real;--> statement-breakpoint
ALTER TABLE `activities` ADD `start_date_local` text;--> statement-breakpoint
ALTER TABLE `activities` ADD `timezone` text;--> statement-breakpoint
ALTER TABLE `activities` ADD `average_speed_meters_per_second` real;--> statement-breakpoint
ALTER TABLE `activities` ADD `max_speed_meters_per_second` real;--> statement-breakpoint
ALTER TABLE `activities` ADD `average_heartrate` real;--> statement-breakpoint
ALTER TABLE `activities` ADD `max_heartrate` real;