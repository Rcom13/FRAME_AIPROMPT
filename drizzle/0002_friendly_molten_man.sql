CREATE TABLE `api_rate_limits` (
	`bucket` text PRIMARY KEY NOT NULL,
	`count` integer NOT NULL,
	`expires_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_api_rate_limits_expires_at` ON `api_rate_limits` (`expires_at`);