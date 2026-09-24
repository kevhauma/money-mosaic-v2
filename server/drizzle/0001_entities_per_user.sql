CREATE TABLE `accounts` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`userId` integer NOT NULL,
	`name` text NOT NULL,
	`type` text NOT NULL,
	`iban` text,
	`currency` text DEFAULT 'EUR' NOT NULL,
	`openingBalance` real NOT NULL,
	`openingBalanceDate` text NOT NULL,
	`color` text NOT NULL,
	`icon` text NOT NULL,
	`archived` integer NOT NULL,
	`ownershipShare` real,
	`coOwners` text,
	`sortOrder` integer,
	FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "accounts_type_check" CHECK("accounts"."type" IN ('checking', 'savings', 'joint', 'invest'))
);
--> statement-breakpoint
CREATE INDEX `accounts_userId_idx` ON `accounts` (`userId`);--> statement-breakpoint
CREATE INDEX `accounts_userId_name_idx` ON `accounts` (`userId`,`name`);--> statement-breakpoint
CREATE INDEX `accounts_userId_type_idx` ON `accounts` (`userId`,`type`);--> statement-breakpoint
CREATE INDEX `accounts_userId_archived_idx` ON `accounts` (`userId`,`archived`);--> statement-breakpoint
CREATE TABLE `appSettings` (
	`userId` integer PRIMARY KEY NOT NULL,
	`primaryColor` text,
	`currencySymbol` text,
	`currencySymbolPosition` text,
	`locale` text,
	`excludedIncomeCategoryIds` text,
	`careerStartDate` text,
	`smoothedBonusCategoryIds` text,
	`grossColor` text,
	`mainIncomeCategoryId` integer,
	`seenGuideSlugs` text,
	`heatmapExcludedCategoryIds` text,
	`privacyMode` integer,
	`fiscalYearStartMonth` integer,
	`recentRanges` text,
	FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "appSettings_primaryColor_check" CHECK("appSettings"."primaryColor" IN ('amber', 'sky', 'violet', 'rose', 'teal', 'lime')),
	CONSTRAINT "appSettings_grossColor_check" CHECK("appSettings"."grossColor" IN ('amber', 'sky', 'violet', 'rose', 'teal', 'lime')),
	CONSTRAINT "appSettings_currencySymbolPosition_check" CHECK("appSettings"."currencySymbolPosition" IN ('before', 'after'))
);
--> statement-breakpoint
CREATE TABLE `categories` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`userId` integer NOT NULL,
	`name` text NOT NULL,
	`kind` text NOT NULL,
	`group` text,
	`color` text NOT NULL,
	`icon` text NOT NULL,
	`archived` integer NOT NULL,
	`isSystem` integer NOT NULL,
	`sortOrder` integer,
	`activeFrom` text,
	`activeUntil` text,
	FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "categories_kind_check" CHECK("categories"."kind" IN ('expense', 'income', 'neutral'))
);
--> statement-breakpoint
CREATE INDEX `categories_userId_idx` ON `categories` (`userId`);--> statement-breakpoint
CREATE INDEX `categories_userId_name_idx` ON `categories` (`userId`,`name`);--> statement-breakpoint
CREATE INDEX `categories_userId_kind_idx` ON `categories` (`userId`,`kind`);--> statement-breakpoint
CREATE INDEX `categories_userId_archived_idx` ON `categories` (`userId`,`archived`);--> statement-breakpoint
CREATE TABLE `categoryComparisonSettings` (
	`userId` integer PRIMARY KEY NOT NULL,
	`excludedCategoryIds` text NOT NULL,
	FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `categoryModel` (
	`userId` integer PRIMARY KEY NOT NULL,
	`modelTopology` blob NOT NULL,
	`weightSpecs` blob NOT NULL,
	`weightData` blob NOT NULL,
	`categoryIdByIndex` text NOT NULL,
	`featureConfig` text NOT NULL,
	`taxonomySignature` text NOT NULL,
	`metrics` text NOT NULL,
	`trainedAt` text NOT NULL,
	`schemaVersion` integer NOT NULL,
	FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `categoryModelSettings` (
	`userId` integer PRIMARY KEY NOT NULL,
	`trainingWindowYears` integer,
	FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `dashboardLayoutSettings` (
	`userId` integer PRIMARY KEY NOT NULL,
	`rowOrder` text NOT NULL,
	`hiddenRowIds` text NOT NULL,
	FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `forecastSettings` (
	`userId` integer PRIMARY KEY NOT NULL,
	`lookbackMonths` integer NOT NULL,
	`basis` text NOT NULL,
	`safetyNetAmount` real NOT NULL,
	`mode` text,
	`scopeAccountIds` text,
	FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "forecastSettings_basis_check" CHECK("forecastSettings"."basis" IN ('net-cash-flow', 'savings-transfers')),
	CONSTRAINT "forecastSettings_mode_check" CHECK("forecastSettings"."mode" IN ('when-affordable', 'required-rate'))
);
--> statement-breakpoint
CREATE TABLE `importBatches` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`userId` integer NOT NULL,
	`accountId` integer NOT NULL,
	`fileName` text NOT NULL,
	`mappingProfileId` integer,
	`importedAt` text NOT NULL,
	`rowsRead` integer NOT NULL,
	`rowsAdded` integer NOT NULL,
	`rowsDuplicate` integer NOT NULL,
	`rowsDuplicateImported` integer,
	`dateFrom` text NOT NULL,
	`dateTo` text NOT NULL,
	FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `importBatches_userId_idx` ON `importBatches` (`userId`);--> statement-breakpoint
CREATE INDEX `importBatches_userId_accountId_idx` ON `importBatches` (`userId`,`accountId`);--> statement-breakpoint
CREATE INDEX `importBatches_userId_importedAt_idx` ON `importBatches` (`userId`,`importedAt`);--> statement-breakpoint
CREATE TABLE `loans` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`userId` integer NOT NULL,
	`name` text NOT NULL,
	`loanType` text NOT NULL,
	`principal` real NOT NULL,
	`interestRate` real NOT NULL,
	`termMonths` integer NOT NULL,
	`startDate` text NOT NULL,
	`categoryId` integer NOT NULL,
	`archived` integer NOT NULL,
	`sortOrder` integer NOT NULL,
	FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`categoryId`) REFERENCES `categories`(`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "loans_loanType_check" CHECK("loans"."loanType" IN ('mortgage', 'auto', 'personal', 'student', 'other'))
);
--> statement-breakpoint
CREATE INDEX `loans_userId_idx` ON `loans` (`userId`);--> statement-breakpoint
CREATE INDEX `loans_userId_categoryId_idx` ON `loans` (`userId`,`categoryId`);--> statement-breakpoint
CREATE INDEX `loans_userId_loanType_idx` ON `loans` (`userId`,`loanType`);--> statement-breakpoint
CREATE INDEX `loans_userId_archived_idx` ON `loans` (`userId`,`archived`);--> statement-breakpoint
CREATE TABLE `mappingProfiles` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`userId` integer NOT NULL,
	`name` text NOT NULL,
	`bankPreset` text,
	`headerSignature` text,
	`delimiter` text NOT NULL,
	`decimalSeparator` text NOT NULL,
	`dateFormat` text NOT NULL,
	`encoding` text NOT NULL,
	`headerRows` integer NOT NULL,
	`signConvention` text NOT NULL,
	`columns` text NOT NULL,
	`defaultAccountId` integer,
	FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "mappingProfiles_dateFormat_check" CHECK("mappingProfiles"."dateFormat" IN ('DD/MM/YYYY', 'YYYY-MM-DD', 'MM/DD/YYYY')),
	CONSTRAINT "mappingProfiles_encoding_check" CHECK("mappingProfiles"."encoding" IN ('utf-8', 'windows-1252')),
	CONSTRAINT "mappingProfiles_signConvention_check" CHECK("mappingProfiles"."signConvention" IN ('as-is', 'debit-negative', 'credit-negative'))
);
--> statement-breakpoint
CREATE INDEX `mappingProfiles_userId_idx` ON `mappingProfiles` (`userId`);--> statement-breakpoint
CREATE INDEX `mappingProfiles_userId_name_idx` ON `mappingProfiles` (`userId`,`name`);--> statement-breakpoint
CREATE INDEX `mappingProfiles_userId_bankPreset_idx` ON `mappingProfiles` (`userId`,`bankPreset`);--> statement-breakpoint
CREATE INDEX `mappingProfiles_userId_defaultAccountId_idx` ON `mappingProfiles` (`userId`,`defaultAccountId`);--> statement-breakpoint
CREATE TABLE `recurringOverrides` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`userId` integer NOT NULL,
	`kind` text NOT NULL,
	`anchorTransactionId` integer NOT NULL,
	`mergedIntoTransactionId` integer,
	`createdAt` text NOT NULL,
	FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`anchorTransactionId`) REFERENCES `transactions`(`id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "recurringOverrides_kind_check" CHECK("recurringOverrides"."kind" IN ('dismissed', 'merged'))
);
--> statement-breakpoint
CREATE INDEX `recurringOverrides_userId_idx` ON `recurringOverrides` (`userId`);--> statement-breakpoint
CREATE INDEX `recurringOverrides_userId_anchorTransactionId_idx` ON `recurringOverrides` (`userId`,`anchorTransactionId`);--> statement-breakpoint
CREATE INDEX `recurringOverrides_userId_kind_idx` ON `recurringOverrides` (`userId`,`kind`);--> statement-breakpoint
CREATE TABLE `rules` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`userId` integer NOT NULL,
	`name` text NOT NULL,
	`priority` integer NOT NULL,
	`enabled` integer NOT NULL,
	`continueOnMatch` integer NOT NULL,
	`conditionMatch` text,
	`conditions` text NOT NULL,
	`action` text NOT NULL,
	FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "rules_conditionMatch_check" CHECK("rules"."conditionMatch" IN ('all', 'any'))
);
--> statement-breakpoint
CREATE INDEX `rules_userId_idx` ON `rules` (`userId`);--> statement-breakpoint
CREATE INDEX `rules_userId_priority_idx` ON `rules` (`userId`,`priority`);--> statement-breakpoint
CREATE INDEX `rules_userId_enabled_idx` ON `rules` (`userId`,`enabled`);--> statement-breakpoint
CREATE TABLE `salaryMetadata` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`userId` integer NOT NULL,
	`yearMonth` text NOT NULL,
	`grossWage` real,
	`bonus` real,
	`note` text,
	FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `salaryMetadata_userId_idx` ON `salaryMetadata` (`userId`);--> statement-breakpoint
CREATE UNIQUE INDEX `salaryMetadata_userId_yearMonth_idx` ON `salaryMetadata` (`userId`,`yearMonth`);--> statement-breakpoint
CREATE TABLE `savingsGoals` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`userId` integer NOT NULL,
	`name` text NOT NULL,
	`targetAmount` real NOT NULL,
	`sortOrder` integer,
	`targetDate` text,
	`note` text,
	`archived` integer NOT NULL,
	`createdAt` text NOT NULL,
	FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `savingsGoals_userId_idx` ON `savingsGoals` (`userId`);--> statement-breakpoint
CREATE INDEX `savingsGoals_userId_sortOrder_idx` ON `savingsGoals` (`userId`,`sortOrder`);--> statement-breakpoint
CREATE TABLE `transactions` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`userId` integer NOT NULL,
	`accountId` integer NOT NULL,
	`bookingDate` text NOT NULL,
	`valueDate` text,
	`amount` real NOT NULL,
	`currency` text DEFAULT 'EUR' NOT NULL,
	`rawDescription` text NOT NULL,
	`counterpartyName` text,
	`counterpartyIban` text,
	`categoryId` integer,
	`categoryManual` integer,
	`transferId` integer,
	`importBatchId` integer,
	`fingerprint` text NOT NULL,
	`notes` text,
	`createdAt` text NOT NULL,
	`rawLine` text,
	`rawRow` text,
	`attributionOverride` text,
	`reimbursementTransferId` integer,
	`nullified` integer,
	FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`accountId`) REFERENCES `accounts`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`categoryId`) REFERENCES `categories`(`id`) ON UPDATE no action ON DELETE set null,
	CONSTRAINT "transactions_currency_check" CHECK("transactions"."currency" IN ('EUR'))
);
--> statement-breakpoint
CREATE INDEX `transactions_userId_idx` ON `transactions` (`userId`);--> statement-breakpoint
CREATE INDEX `transactions_userId_accountId_idx` ON `transactions` (`userId`,`accountId`);--> statement-breakpoint
CREATE INDEX `transactions_userId_bookingDate_idx` ON `transactions` (`userId`,`bookingDate`);--> statement-breakpoint
CREATE INDEX `transactions_userId_categoryId_idx` ON `transactions` (`userId`,`categoryId`);--> statement-breakpoint
CREATE INDEX `transactions_userId_transferId_idx` ON `transactions` (`userId`,`transferId`);--> statement-breakpoint
CREATE INDEX `transactions_userId_fingerprint_idx` ON `transactions` (`userId`,`fingerprint`);--> statement-breakpoint
CREATE INDEX `transactions_userId_importBatchId_idx` ON `transactions` (`userId`,`importBatchId`);--> statement-breakpoint
CREATE INDEX `transactions_userId_reimbursementTransferId_idx` ON `transactions` (`userId`,`reimbursementTransferId`);--> statement-breakpoint
CREATE TABLE `transferSettings` (
	`userId` integer PRIMARY KEY NOT NULL,
	`matchWindowDays` integer NOT NULL,
	`autoLinkMediumConfidence` integer NOT NULL,
	FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `transfers` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`userId` integer NOT NULL,
	`fromTransactionId` integer NOT NULL,
	`toTransactionId` integer NOT NULL,
	`method` text NOT NULL,
	`confidence` text NOT NULL,
	`linkedAt` text NOT NULL,
	FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`fromTransactionId`) REFERENCES `transactions`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`toTransactionId`) REFERENCES `transactions`(`id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "transfers_method_check" CHECK("transfers"."method" IN ('auto-iban', 'auto-amountdate', 'manual')),
	CONSTRAINT "transfers_confidence_check" CHECK("transfers"."confidence" IN ('high', 'medium', 'manual'))
);
--> statement-breakpoint
CREATE INDEX `transfers_userId_idx` ON `transfers` (`userId`);--> statement-breakpoint
CREATE INDEX `transfers_userId_fromTransactionId_idx` ON `transfers` (`userId`,`fromTransactionId`);--> statement-breakpoint
CREATE INDEX `transfers_userId_toTransactionId_idx` ON `transfers` (`userId`,`toTransactionId`);