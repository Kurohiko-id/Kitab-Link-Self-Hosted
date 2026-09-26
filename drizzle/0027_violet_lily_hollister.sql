CREATE TABLE `discord_widgets` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`page_id` integer NOT NULL,
	`name` text NOT NULL,
	`guild_id` text NOT NULL,
	`style` text DEFAULT 'custom' NOT NULL,
	`placement_mode` text DEFAULT 'inline' NOT NULL,
	`floating_position` text,
	`title` text,
	`show_member_count` integer DEFAULT true NOT NULL,
	`show_avatars` integer DEFAULT true NOT NULL,
	`show_voice_channels` integer DEFAULT true NOT NULL,
	`show_join_button` integer DEFAULT true NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`page_id`) REFERENCES `pages`(`id`) ON UPDATE no action ON DELETE cascade
);
