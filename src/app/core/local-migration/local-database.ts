import Dexie from 'dexie';
// Deep imports rather than the `@/core/data-access` barrel, on purpose. This module is loaded by a
// dynamic `import()` precisely so Dexie stays out of every other chunk, and the barrel re-exports
// twenty Angular repositories — pulling it in here would put all of them in the one chunk that was
// split off to be small and one-time.
import { appDb } from '@/core/data-access/app-db';
import type { AppDataExport } from '@/core/data-access/data-management.repository';
import type { CategoryModelArtifact } from '@/core/data-access/entities';
import { LOCAL_DATABASE_NAME } from './local-database-name';

/**
 * The last reader of the browser database (TICKET-SRV-07).
 *
 * Since TICKET-SRV-05 every repository talks to `/api` and nothing opens `money-mosaic` any more —
 * it is invisible, not gone, and it stays on disk until its owner clears their site data. This is
 * the one module that opens it again, to hand it to the server once, and TICKET-SRV-08 deletes it
 * along with `app-db.ts` itself.
 *
 * It is exempt from `dexie-boundary.spec.ts` by living outside `core/data-access/`: that spec says
 * no *repository* reads Dexie, which is still exactly true. This is not a repository — it has no
 * `/api` route behind it and no store reads it.
 *
 * **Opening the database runs Dexie's own upgrade chain**, so a browser sitting at schema v9 is
 * migrated to v16 by the act of being read, and the document handed to the server is always at the
 * current version. That is why there is no "older schema" branch anywhere here: Dexie has already
 * resolved it by the time the first row is read. It is also why nothing may open `appDb` before
 * {@link localDatabaseExists} has answered — opening a database that is not there *creates* it.
 */

/** Enough to tell the user what was found, without reading a single transaction row. */
export type LocalDatabaseSummary = {
  readonly accounts: number;
  readonly transactions: number;
  readonly categories: number;
  /** ISO dates, or `null` when there are no transactions. */
  readonly earliestBookingDate: string | null;
  readonly latestBookingDate: string | null;
  readonly hasTrainedModel: boolean;
};

export type LocalDatabaseSnapshot = {
  /** Every table except `categoryModel`, in the same document shape a backup file has. */
  readonly data: AppDataExport;
  /**
   * The trained model, read straight off Dexie with its `ArrayBuffer`s intact. It is kept out of
   * `data` deliberately: `JSON.stringify` turns an `ArrayBuffer` into `{}`, which is how the file
   * export has always silently lost every trained weight (TICKET-DAT-05's closing note). This one
   * travels as bytes, through `PUT /api/categoryModel`.
   */
  readonly model: CategoryModelArtifact | undefined;
};

/** The table whose rows cannot survive a JSON document — see {@link LocalDatabaseSnapshot.model}. */
const MODEL_TABLE = 'categoryModel';

/** Without creating one. `Dexie.exists` opens schema-less and reads a rejection as "no". */
export const localDatabaseExists = (): Promise<boolean> => Dexie.exists(LOCAL_DATABASE_NAME);

/**
 * What is in there, or `null` when there is nothing worth offering to move.
 *
 * "Nothing worth moving" is **no accounts and no transactions**, not "no rows": a database Dexie
 * created and then never had anything put into it still holds the eleven seeded categories, the two
 * mapping-profile templates and a transfer-settings row, and offering to migrate those into an
 * account that was seeded with the same constants would be a prompt with nothing behind it.
 */
export const readLocalDatabaseSummary = async (): Promise<LocalDatabaseSummary | null> => {
  if (!(await localDatabaseExists())) return null;

  await appDb.open();
  const [accounts, transactions, categories] = await Promise.all([
    appDb.accounts.count(),
    appDb.transactions.count(),
    appDb.categories.count(),
  ]);
  if (accounts === 0 && transactions === 0) return null;

  const byDate = appDb.transactions.orderBy('bookingDate');
  const [earliest, latest, model] = await Promise.all([
    byDate.first(),
    appDb.transactions.orderBy('bookingDate').reverse().first(),
    appDb.categoryModel.get(1),
  ]);

  return {
    accounts,
    transactions,
    categories,
    earliestBookingDate: earliest?.bookingDate ?? null,
    latestBookingDate: latest?.bookingDate ?? null,
    hasTrainedModel: model !== undefined,
  };
};

/**
 * The whole database as one document, read in a single Dexie transaction so what is uploaded is one
 * consistent moment rather than eighteen reads that could interleave with a tab still writing.
 *
 * Generic over `appDb.tables` for the same reason `exportAll` always was: a table nobody remembered
 * is still carried.
 */
export const readLocalDatabase = async (): Promise<LocalDatabaseSnapshot> => {
  await appDb.open();

  const tables: Record<string, unknown[]> = {};
  await appDb.transaction('r', appDb.tables, async () => {
    for (const table of appDb.tables) {
      if (table.name === MODEL_TABLE) continue;
      tables[table.name] = await table.toArray();
    }
  });

  return {
    data: { schemaVersion: appDb.verno, exportedAt: new Date().toISOString(), tables },
    model: await appDb.categoryModel.get(1),
  };
};

/**
 * Deletes the browser database outright — offered only *after* a successful move, and only ever as
 * the user's own choice. Declining leaves it exactly where it is, which is a free second copy.
 */
export const deleteLocalDatabase = async (): Promise<void> => {
  await appDb.delete();
};
