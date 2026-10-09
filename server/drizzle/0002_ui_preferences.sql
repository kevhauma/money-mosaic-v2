CREATE TABLE `uiPreferences` (
	`userId` integer PRIMARY KEY NOT NULL,
	`themeStyle` text,
	`hasVisited` integer,
	`backupReminderDismissed` integer,
	FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "uiPreferences_themeStyle_check" CHECK("uiPreferences"."themeStyle" IN ('deformable', 'deformable-dark', 'neumorphism', 'neumorphism-dark', 'liquid-glass', 'cyberpunk', 'skeuomorphism', 'anti-polish', 'memphis', 'retro-futurism'))
);
