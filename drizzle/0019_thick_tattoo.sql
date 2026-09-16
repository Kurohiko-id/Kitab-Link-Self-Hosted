CREATE TABLE `preview_tokens` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` integer NOT NULL,
	`token_hash` text NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `preview_tokens_user_id_unique` ON `preview_tokens` (`user_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `preview_tokens_token_hash_unique` ON `preview_tokens` (`token_hash`);