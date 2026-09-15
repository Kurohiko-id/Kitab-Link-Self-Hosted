PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_themes` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`tokens_json` text DEFAULT '{}' NOT NULL
);
--> statement-breakpoint
INSERT INTO `__new_themes`("id", "name", "tokens_json") SELECT "id", "name", "tokens_json" FROM `themes`;--> statement-breakpoint
DROP TABLE `themes`;--> statement-breakpoint
ALTER TABLE `__new_themes` RENAME TO `themes`;--> statement-breakpoint
PRAGMA foreign_keys=ON;