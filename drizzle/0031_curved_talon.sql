ALTER TABLE `discord_widgets` ADD `width` integer;--> statement-breakpoint
ALTER TABLE `discord_widgets` ADD `height` integer;--> statement-breakpoint
ALTER TABLE `discord_widgets` ADD `is_enabled` integer DEFAULT true NOT NULL;