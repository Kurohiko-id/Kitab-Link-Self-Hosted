CREATE TABLE `content_feeds` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`page_id` integer NOT NULL,
	`group_id` integer NOT NULL,
	`feed_url` text NOT NULL,
	`label` text,
	`rich_preview` integer DEFAULT true NOT NULL,
	`is_active` integer DEFAULT true NOT NULL,
	`last_item_guid` text,
	`last_checked_at` integer,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`page_id`) REFERENCES `pages`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`group_id`) REFERENCES `link_groups`(`id`) ON UPDATE no action ON DELETE cascade
);
