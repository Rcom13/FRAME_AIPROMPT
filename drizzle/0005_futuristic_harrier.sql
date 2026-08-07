CREATE TABLE `model_service_connections` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`kind` text NOT NULL,
	`label` text NOT NULL,
	`provider_id` text NOT NULL,
	`api_base_url` text NOT NULL,
	`model_id` text NOT NULL,
	`encrypted_api_key` text NOT NULL,
	`key_iv` text NOT NULL,
	`encrypted_api_secret` text,
	`secret_iv` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_model_service_connections_user_kind` ON `model_service_connections` (`user_id`,`kind`);--> statement-breakpoint
CREATE INDEX `idx_model_service_connections_user_updated` ON `model_service_connections` (`user_id`,`updated_at`);