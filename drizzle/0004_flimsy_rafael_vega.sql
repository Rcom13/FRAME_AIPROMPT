CREATE TABLE `video_generation_configs` (
	`user_id` text PRIMARY KEY NOT NULL,
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
