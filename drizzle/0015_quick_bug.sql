PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_scheduled_rules` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`page_id` integer NOT NULL,
	`trigger_type` text NOT NULL,
	`config_json` text DEFAULT '{}' NOT NULL,
	`target_type` text,
	`target_id` integer,
	`last_checked_at` integer,
	`last_state` text,
	`last_live_url` text,
	FOREIGN KEY (`page_id`) REFERENCES `pages`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
INSERT INTO `__new_scheduled_rules`("id", "page_id", "trigger_type", "config_json", "target_type", "target_id", "last_checked_at", "last_state", "last_live_url") SELECT "id", "page_id", "trigger_type", "config_json", "target_type", "target_id", "last_checked_at", "last_state", "last_live_url" FROM `scheduled_rules`;--> statement-breakpoint
DROP TABLE `scheduled_rules`;--> statement-breakpoint
ALTER TABLE `__new_scheduled_rules` RENAME TO `scheduled_rules`;--> statement-breakpoint
PRAGMA foreign_keys=ON;