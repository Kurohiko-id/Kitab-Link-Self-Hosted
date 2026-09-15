CREATE TABLE `live_badges` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`page_id` integer NOT NULL,
	`channel_url` text NOT NULL,
	`is_live` integer DEFAULT false NOT NULL,
	`video_url` text,
	`last_checked_at` integer,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`page_id`) REFERENCES `pages`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `live_badges_page_id_unique` ON `live_badges` (`page_id`);--> statement-breakpoint
PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_scheduled_rules` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`page_id` integer NOT NULL,
	`trigger_type` text NOT NULL,
	`config_json` text DEFAULT '{}' NOT NULL,
	`target_type` text NOT NULL,
	`target_id` integer NOT NULL,
	`last_checked_at` integer,
	`last_state` text,
	FOREIGN KEY (`page_id`) REFERENCES `pages`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
INSERT INTO `__new_scheduled_rules`("id", "page_id", "trigger_type", "config_json", "target_type", "target_id", "last_checked_at", "last_state") SELECT "id", "page_id", "trigger_type", "config_json", "target_type", "target_id", "last_checked_at", "last_state" FROM `scheduled_rules`;--> statement-breakpoint
DROP TABLE `scheduled_rules`;--> statement-breakpoint
ALTER TABLE `__new_scheduled_rules` RENAME TO `scheduled_rules`;--> statement-breakpoint
PRAGMA foreign_keys=ON;