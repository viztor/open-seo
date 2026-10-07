PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_bing_connections` (
	`id` text PRIMARY KEY NOT NULL,
	`project_id` text NOT NULL,
	`organization_id` text NOT NULL,
	`site_url` text NOT NULL,
	`connected_by_user_id` text NOT NULL,
	`credential_id` text,
	`created_at` text DEFAULT (current_timestamp) NOT NULL,
	`updated_at` text DEFAULT (current_timestamp) NOT NULL,
	FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`organization_id`) REFERENCES `organization`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`credential_id`) REFERENCES `bing_credentials`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
INSERT INTO `__new_bing_connections`("id", "project_id", "organization_id", "site_url", "connected_by_user_id", "credential_id", "created_at", "updated_at") SELECT "id", "project_id", "organization_id", "site_url", "connected_by_user_id", "credential_id", "created_at", "updated_at" FROM `bing_connections`;--> statement-breakpoint
DROP TABLE `bing_connections`;--> statement-breakpoint
ALTER TABLE `__new_bing_connections` RENAME TO `bing_connections`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE UNIQUE INDEX `bing_connections_project_idx` ON `bing_connections` (`project_id`);--> statement-breakpoint
CREATE INDEX `bing_connections_organization_idx` ON `bing_connections` (`organization_id`);--> statement-breakpoint
CREATE INDEX `bing_connections_credential_idx` ON `bing_connections` (`credential_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `account_bing_grant_owner_idx` ON `account` (`user_id`,`provider_id`,`account_id`) WHERE "account"."provider_id" = 'bing-webmaster';