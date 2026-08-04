CREATE TABLE `comfy_backend_configs` (
	`user_id` text PRIMARY KEY NOT NULL,
	`mode` text NOT NULL,
	`base_url` text NOT NULL,
	`auth_mode` text NOT NULL,
	`encrypted_api_key` text NOT NULL,
	`key_iv` text NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
