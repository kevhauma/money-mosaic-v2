CREATE TABLE `sessions` (
	`token` text PRIMARY KEY NOT NULL,
	`userId` integer NOT NULL,
	`createdAt` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `sessions_userId_idx` ON `sessions` (`userId`);--> statement-breakpoint
CREATE TABLE `users` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`email` text NOT NULL,
	`displayName` text NOT NULL,
	`passwordHash` text NOT NULL,
	`passwordSalt` text NOT NULL,
	`role` text DEFAULT 'user' NOT NULL,
	`disabled` integer DEFAULT false NOT NULL,
	`createdAt` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`passwordUpdatedAt` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	CONSTRAINT "users_role_check" CHECK("users"."role" IN ('admin', 'user'))
);
--> statement-breakpoint
CREATE UNIQUE INDEX `users_email_unique` ON `users` (`email`);