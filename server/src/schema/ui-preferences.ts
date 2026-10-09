import { integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';

import { THEME_STYLE_IDS } from 'shared/seed-data.js';
import { inList, ownerPrimaryKey } from './columns.js';

/**
 * Per-user interface state — one row per user (TICKET-SRV-10).
 *
 * These three flags were the app's last `localStorage` keys: the chosen theme, whether the landing
 * page has been seen, and whether the backup reminder has been waved away. They were per-browser,
 * each with its own argument for why that was right; they are per-account now, because an app whose
 * every other byte lives in this database and whose last three live in whichever browser you
 * happened to open is two systems, and only one of them is backed up or exportable.
 *
 * **A table of its own rather than three more columns on `appSettings`.** That row is the user's
 * portable settings — currency, locale, accent, fiscal year, things a person recognises on a
 * settings page. These are state the interface keeps about itself, and nobody edits `hasVisited`.
 *
 * **Every column is nullable, the `appSettings` tri-state convention** (see its schema): an unset
 * field means "never chosen" and falls back to `DEFAULT_UI_PREFERENCES` on read, so a user with no
 * row at all reads exactly like a user whose row is all NULLs. A NOT NULL DEFAULT would turn "has
 * not picked a theme" into a concrete pick, and the day `DEFAULT_STYLE` changes it would be the
 * difference between everyone following it and nobody doing so.
 */
export const uiPreferences = sqliteTable(
  'uiPreferences',
  {
    userId: ownerPrimaryKey(),
    /** A catalogue id from `THEME_STYLE_IDS`, not a `data-theme` value — the mapping is the client's. */
    themeStyle: text('themeStyle', { enum: THEME_STYLE_IDS }),
    /** Reached the dashboard at least once, which retires the landing page at `/` (TICKET-PUB-01). */
    hasVisited: integer('hasVisited', { mode: 'boolean' }),
    /** Been told where this account's data lives and who backs it up (TICKET-PUB-04). */
    backupReminderDismissed: integer('backupReminderDismissed', { mode: 'boolean' }),
  },
  (table) => [inList('uiPreferences_themeStyle_check', table.themeStyle, THEME_STYLE_IDS)],
);

export type UiPreferencesRow = typeof uiPreferences.$inferSelect;
export type NewUiPreferencesRow = typeof uiPreferences.$inferInsert;
