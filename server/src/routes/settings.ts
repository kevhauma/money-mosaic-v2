import { eq } from 'drizzle-orm';
import { Router } from 'express';
import type { SQLiteColumn, SQLiteTable } from 'drizzle-orm/sqlite-core';

import {
  DEFAULT_APP_SETTINGS,
  DEFAULT_CATEGORY_COMPARISON_SETTINGS,
  DEFAULT_CATEGORY_MODEL_SETTINGS,
  DEFAULT_DASHBOARD_LAYOUT_SETTINGS,
  DEFAULT_FORECAST_SETTINGS,
  DEFAULT_TRANSFER_SETTINGS,
  DEFAULT_UI_PREFERENCES,
} from 'shared/seed-data.js';

import type { DbOrTx, DrizzleDb } from '../db.js';
import { toEntity } from '../http/entity-response.js';
import { assertReferencesOwned } from '../http/ownership.js';
import { parseEntityBody, type EntityValues } from '../http/validate.js';
import { authUserOf } from '../middleware/require-auth.js';
import { appSettings } from '../schema/app-settings.js';
import { categoryComparisonSettings } from '../schema/category-comparison-settings.js';
import { categoryModelSettings } from '../schema/category-model-settings.js';
import { dashboardLayoutSettings } from '../schema/dashboard-layout-settings.js';
import { forecastSettings } from '../schema/forecast-settings.js';
import { transferSettings } from '../schema/transfer-settings.js';
import { uiPreferences } from '../schema/ui-preferences.js';

/**
 * `/api/settings/<name>` (TICKET-SRV-03) — one `GET` and one `PATCH` per singleton table.
 *
 * **One endpoint replaces twenty-two setters.** `AppSettingsRepository` has fourteen of them,
 * `ForecastSettingsRepository` five, and each is the same read-merge-put against `id = 1`. Here the
 * merge happens server-side inside a transaction, so the setters keep their client-side signatures
 * and simply each send a one-field patch — and two tabs patching two different fields at the same
 * moment can no longer lose one of them, which a client-side read-merge-put always could.
 *
 * **A user with no row reads exactly like a user whose row is all NULLs.** That tri-state is the
 * whole design of `appSettings` (see its schema), so `GET` answers an unwritten singleton with the
 * shared `DEFAULT_*` constant the client's stores start from, and `PATCH` merges into that
 * same constant when it creates the row. The constants live in `shared/seed-data.ts` precisely so
 * there is one definition of them rather than one per side.
 *
 * The one singleton that is not here is `categoryModel`: it is megabytes of trained weights and gets
 * binary endpoints of its own in `category-model.ts` rather than a JSON body.
 */

/** A one-row-per-user table, keyed by the owner itself — no surrogate `id` (TICKET-SRV-02). */
export type SingletonTable = SQLiteTable & { readonly userId: SQLiteColumn };

export type SingletonSettings = {
  /** The `<name>` in `/api/settings/<name>`, which is the table's own name. */
  readonly name: string;
  readonly table: SingletonTable;
  /** What an unwritten row reads as — the same object the client's stores start from. */
  readonly defaults: EntityValues;
};

/**
 * The `id: 1` each `DEFAULT_*` carries is the old singleton convention the browser database still
 * keys on. Here the owner is the key, so it is dropped on the way in.
 */
const withoutId = ({ id: _id, ...rest }: { id?: unknown }): EntityValues => rest;

export const SETTINGS_TABLES: readonly SingletonSettings[] = [
  { name: 'appSettings', table: appSettings, defaults: withoutId(DEFAULT_APP_SETTINGS) },
  {
    name: 'transferSettings',
    table: transferSettings,
    defaults: withoutId(DEFAULT_TRANSFER_SETTINGS),
  },
  {
    name: 'forecastSettings',
    table: forecastSettings,
    defaults: withoutId(DEFAULT_FORECAST_SETTINGS),
  },
  {
    name: 'categoryComparisonSettings',
    table: categoryComparisonSettings,
    defaults: withoutId(DEFAULT_CATEGORY_COMPARISON_SETTINGS),
  },
  {
    name: 'dashboardLayoutSettings',
    table: dashboardLayoutSettings,
    defaults: withoutId(DEFAULT_DASHBOARD_LAYOUT_SETTINGS),
  },
  {
    name: 'categoryModelSettings',
    table: categoryModelSettings,
    defaults: withoutId(DEFAULT_CATEGORY_MODEL_SETTINGS),
  },
  { name: 'uiPreferences', table: uiPreferences, defaults: withoutId(DEFAULT_UI_PREFERENCES) },
];

/** The stored row layered over the defaults, which is what an unwritten field means. */
export const readSettings = (
  tx: DbOrTx,
  { table, defaults }: SingletonSettings,
  userId: number,
) => {
  const row = tx.select().from(table).where(eq(table.userId, userId)).get() as
    Record<string, unknown> | undefined;

  return row === undefined ? { ...defaults } : { ...defaults, ...toEntity(row) };
};

/**
 * The defaults as a row. `DEFAULT_APP_SETTINGS` declares every field as `undefined` rather than
 * omitting it (its stores read the keys), and SQLite has no `undefined` — so the undefined ones are
 * dropped here, leaving the NOT NULL columns `forecastSettings` and the two layout singletons do
 * declare concrete defaults for.
 */
const insertableDefaults = (defaults: EntityValues): EntityValues =>
  Object.fromEntries(Object.entries(defaults).filter(([, value]) => value !== undefined));

export const createSettingsRouter = (db: DrizzleDb, settings: SingletonSettings): Router => {
  const router = Router();
  const { table } = settings;

  router.get('/', (req, res) => {
    const user = authUserOf(req);
    res.json(readSettings(db, settings, user.id));
  });

  router.patch('/', (req, res) => {
    const user = authUserOf(req);
    const values = parseEntityBody(table, req.body, { mode: 'patch' });

    // Read, create-or-merge and read back in **one** transaction. Two concurrent one-field patches
    // are what this is for: each is a single `UPDATE … SET <that column>`, so neither writes back a
    // stale copy of the other's field the way a client-side read-merge-put would.
    const merged = db.transaction((tx) => {
      assertReferencesOwned(tx, table, values, user.id);
      const exists = tx.select().from(table).where(eq(table.userId, user.id)).get() !== undefined;

      if (!exists) {
        tx.insert(table)
          .values({ ...insertableDefaults(settings.defaults), ...values, userId: user.id } as never)
          .run();
      } else if (Object.keys(values).length > 0) {
        tx.update(table)
          .set(values as never)
          .where(eq(table.userId, user.id))
          .run();
      }

      return readSettings(tx, settings, user.id);
    });

    res.json(merged);
  });

  return router;
};
