ALTER TABLE `links` ADD `image_hide_border` integer DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `links` ADD `image_hide_background` integer DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `links` ADD `image_radius` integer;--> statement-breakpoint
ALTER TABLE `links` ADD `image_shadow` text DEFAULT 'theme' NOT NULL;