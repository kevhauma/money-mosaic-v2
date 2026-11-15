// Drizzle schema for the Money Mosaic backend.
//
// TICKET-AUTH-01 added the first two tables — `users` and `sessions`. TICKET-SRV-02 ports the rest
// of the Dexie data model into sibling modules re-exported from here: eighteen entity tables, each
// row owned by a `users.id`, seven of which were `id = 1` singletons in a database that belonged to
// one person and are now one row per user keyed by the owner itself. TICKET-SRV-10 adds the
// nineteenth, `uiPreferences` — the three flags that were still living in `localStorage` after the
// rest of the data moved here.
//
// `drizzle.config.ts` points at this file, so a table module that is not re-exported here is
// invisible to `drizzle-kit generate` and never reaches a migration. `dexie-parity.spec.ts`
// enumerates the Dexie stores against these exports so that cannot happen quietly.
export * from './accounts.js';
export * from './api-tokens.js';
export * from './app-settings.js';
export * from './categories.js';
export * from './category-comparison-settings.js';
export * from './category-model.js';
export * from './category-model-settings.js';
export * from './dashboard-layout-settings.js';
export * from './forecast-settings.js';
export * from './import-batches.js';
export * from './loans.js';
export * from './mapping-profiles.js';
export * from './recurring-overrides.js';
export * from './rules.js';
export * from './salary-metadata.js';
export * from './savings-goals.js';
export * from './sessions.js';
export * from './transactions.js';
export * from './transfer-settings.js';
export * from './transfers.js';
export * from './ui-preferences.js';
export * from './users.js';
