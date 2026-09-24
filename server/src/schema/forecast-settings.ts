import { integer, real, sqliteTable, text } from 'drizzle-orm/sqlite-core';

import type { ForecastMode, SavingBasis } from 'shared/entities.js';
import { inList, json, ownerPrimaryKey } from './columns.js';

const BASES: readonly [SavingBasis, ...SavingBasis[]] = ['net-cash-flow', 'savings-transfers'];
const MODES: readonly [ForecastMode, ...ForecastMode[]] = ['when-affordable', 'required-rate'];

/**
 * The `/future` forecast's own parameters (TICKET-FUT-02) — one row per user, ported from Dexie's
 * `forecastSettings` singleton (TICKET-SRV-02).
 *
 * `mode` and `scopeAccountIds` are nullable because rows written before TICKET-FUT-09 and
 * TICKET-FUT-08 carry neither; both read as their default (`when-affordable`, every account),
 * exactly as the repository resolves them today.
 *
 * `scopeAccountIds` is JSON rather than a foreign-keyed join table for the same reason as
 * `categoryComparisonSettings.excludedCategoryIds` — it is read whole, and an id left behind by a
 * deleted account narrows a forecast to nothing rather than corrupting anything.
 */
export const forecastSettings = sqliteTable(
  'forecastSettings',
  {
    userId: ownerPrimaryKey(),
    /** Complete months of history the velocity is measured over (FUT-01). */
    lookbackMonths: integer('lookbackMonths').notNull(),
    basis: text('basis', { enum: BASES }).notNull(),
    /** Cash kept aside and never spent on a goal — the emergency float. Never negative. */
    safetyNetAmount: real('safetyNetAmount').notNull(),
    /** Solve for the date a goal becomes affordable, or for the rate it demands (FUT-09). */
    mode: text('mode', { enum: MODES }),
    /** Accounts the forecast may consider (FUT-08). NULL or empty = every account. */
    scopeAccountIds: json<number[]>('scopeAccountIds'),
  },
  (table) => [
    inList('forecastSettings_basis_check', table.basis, BASES),
    inList('forecastSettings_mode_check', table.mode, MODES),
  ],
);

export type ForecastSettingsRow = typeof forecastSettings.$inferSelect;
export type NewForecastSettingsRow = typeof forecastSettings.$inferInsert;
