CREATE TABLE `apiTokens` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`userId` integer NOT NULL,
	`name` text NOT NULL,
	`tokenHash` text NOT NULL,
	`createdAt` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `apiTokens_tokenHash_unique` ON `apiTokens` (`tokenHash`);--> statement-breakpoint
CREATE INDEX `apiTokens_userId_idx` ON `apiTokens` (`userId`);