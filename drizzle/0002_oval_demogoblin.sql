CREATE TABLE `scheduled_rules` (
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
