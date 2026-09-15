ALTER TABLE `links` ADD `last_checked_at` integer;--> statement-breakpoint
ALTER TABLE `links` ADD `last_check_status` text;--> statement-breakpoint
ALTER TABLE `links` ADD `consecutive_failures` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `scheduled_rules` ADD `last_live_url` text;