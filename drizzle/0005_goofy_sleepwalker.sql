PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_pages` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` integer NOT NULL,
	`slug` text NOT NULL,
	`domain_type` text DEFAULT 'subpath' NOT NULL,
	`domain_value` text,
	`domain_verified` integer DEFAULT false NOT NULL,
	`password_hash` text,
	`profile_json` text DEFAULT '{}' NOT NULL,
	`theme_id` integer,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`theme_id`) REFERENCES `themes`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
INSERT INTO `__new_pages`("id", "user_id", "slug", "domain_type", "domain_value", "domain_verified", "password_hash", "profile_json", "theme_id", "created_at") SELECT "id", "user_id", "slug", "domain_type", "domain_value", "domain_verified", "password_hash", "profile_json", "theme_id", "created_at" FROM `pages`;--> statement-breakpoint
DROP TABLE `pages`;--> statement-breakpoint
ALTER TABLE `__new_pages` RENAME TO `pages`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE UNIQUE INDEX `pages_slug_unique` ON `pages` (`slug`);--> statement-breakpoint
ALTER TABLE `themes` ADD `user_id` integer NOT NULL REFERENCES users(id);--> statement-breakpoint
ALTER TABLE `themes` ADD `created_at` integer DEFAULT (unixepoch()) NOT NULL;