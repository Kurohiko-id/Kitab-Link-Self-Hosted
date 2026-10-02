CREATE TABLE `image_buttons` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` integer NOT NULL,
	`label` text NOT NULL,
	`path` text NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
ALTER TABLE `links` ADD `image_button_id` integer REFERENCES image_buttons(id);
--> statement-breakpoint
INSERT INTO `image_buttons` (`user_id`, `label`, `path`)
SELECT `pages`.`user_id`, `links`.`title`, `links`.`thumbnail_path`
FROM `links` INNER JOIN `pages` ON `pages`.`id` = `links`.`page_id`
WHERE `links`.`display_style` = 'image' AND `links`.`thumbnail_path` IS NOT NULL
ORDER BY `links`.`id`;
--> statement-breakpoint
UPDATE `links`
SET `image_button_id` = (SELECT `id` FROM `image_buttons` WHERE `image_buttons`.`path` = `links`.`thumbnail_path` LIMIT 1),
    `thumbnail_path` = NULL
WHERE `display_style` = 'image' AND `thumbnail_path` IS NOT NULL;
