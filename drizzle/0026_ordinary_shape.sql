ALTER TABLE `activity_logs` ADD `source` text DEFAULT 'dashboard' NOT NULL;--> statement-breakpoint
ALTER TABLE `activity_logs` ADD `source_label` text;