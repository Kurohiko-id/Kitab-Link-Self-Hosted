ALTER TABLE `links` ADD `link_type` text DEFAULT 'url' NOT NULL;--> statement-breakpoint
ALTER TABLE `links` ADD `featured` integer DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `links` ADD `utm_source` text;--> statement-breakpoint
ALTER TABLE `links` ADD `utm_medium` text;--> statement-breakpoint
ALTER TABLE `links` ADD `utm_campaign` text;