import { integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';

import type { AccentColorId, CurrencySymbolPosition, RecentRange } from 'shared/entities.js';
import { inList, jsonArray, ownerPrimaryKey } from './columns.js';

const ACCENT_COLORS: readonly [AccentColorId, ...AccentColorId[]] = [
  'amber',
  'sky',
  'violet',
  'rose',
  'teal',
  'lime',
];
const SYMBOL_POSITIONS: readonly [CurrencySymbolPosition, ...CurrencySymbolPosition[]] = [
  'before',
  'after',
];

/**
 * App-wide portable settings (TICKET-SET-05) — one row per user, ported from Dexie's `appSettings`
 * singleton (TICKET-SRV-02). Portable/exportable preferences only; `ThemeService`'s appearance
 * choice stays `localStorage`-only by design and has no column here.
 *
 * **Every column is nullable, and that is the whole design of this row.** Each field is
 * `T | undefined` on `AppSettings` precisely so an unset value falls back to the reader's
 * `?? DEFAULT_*` — the tri-state the ngrx stores depend on. A NOT NULL with a default would turn
 * "the user has not chosen" into a concrete choice and quietly change everyone's formatting, so a
 * user with no row at all reads exactly like a user whose row is all NULLs: `DEFAULT_APP_SETTINGS`.
 *
 * The id-list fields are JSON arrays, the `categoryComparisonSettings.excludedCategoryIds`
 * convention: read whole, never queried across users, and harmless holding an id whose category
 * is gone.
 */
export const appSettings = sqliteTable(
  'appSettings',
  {
    userId: ownerPrimaryKey(),
    /** A fixed palette key, not a freeform hex; only applied under the Default Light/Dark themes. */
    primaryColor: text('primaryColor', { enum: ACCENT_COLORS }),
    /** A display-only symbol overlay, not an ISO 4217 code — this app does no conversion. */
    currencySymbol: text('currencySymbol'),
    currencySymbolPosition: text('currencySymbolPosition', { enum: SYMBOL_POSITIONS }),
    /** A BCP 47 tag (e.g. `en-BE`) driving number grouping, separators and date formatting. */
    locale: text('locale'),
    /** Income categories opted *out* of "my income growth" (FR-INC-3). */
    excludedIncomeCategoryIds: jsonArray<number[]>('excludedIncomeCategoryIds'),
    /** ISO `YYYY-MM-DD` the user's working life started — not where their history begins. */
    careerStartDate: text('careerStartDate'),
    /** Income categories marked as an annual lump sum, spread across their year (FR-INC-4). */
    smoothedBonusCategoryIds: jsonArray<number[]>('smoothedBonusCategoryIds'),
    /** Colour of the `/income` gross-pay series, so gross and net are told apart deliberately. */
    grossColor: text('grossColor', { enum: ACCENT_COLORS }),
    /** The category salary lands in, so a recorded bonus comes off that one rather than pro rata. */
    mainIncomeCategoryId: integer('mainIncomeCategoryId'),
    /** How-to guides whose first-visit intro has been shown. Nothing writes it since TICKET-INC-23. */
    seenGuideSlugs: jsonArray<string[]>('seenGuideSlugs'),
    /** Expense categories left out of the Dashboard's spending heatmap (FR-STAT-15). */
    heatmapExcludedCategoryIds: jsonArray<number[]>('heatmapExcludedCategoryIds'),
    /** Blurs every figure on the Dashboard so the page survives a screen-share. NULL = off. */
    privacyMode: integer('privacyMode', { mode: 'boolean' }),
    /** Calendar month (1-12) a fiscal year begins in. NULL = January, today's behaviour. */
    fiscalYearStartMonth: integer('fiscalYearStartMonth'),
    /**
     * The last ten date ranges applied to any picker, most-recent-first. Holds canonical
     * range-expression text (`now-30d`), not resolved dates, so a saved relative range still
     * means "the last 30 days" on read.
     */
    recentRanges: jsonArray<RecentRange[]>('recentRanges'),
  },
  (table) => [
    inList('appSettings_primaryColor_check', table.primaryColor, ACCENT_COLORS),
    inList('appSettings_grossColor_check', table.grossColor, ACCENT_COLORS),
    inList(
      'appSettings_currencySymbolPosition_check',
      table.currencySymbolPosition,
      SYMBOL_POSITIONS,
    ),
  ],
);

export type AppSettingsRow = typeof appSettings.$inferSelect;
export type NewAppSettingsRow = typeof appSettings.$inferInsert;
