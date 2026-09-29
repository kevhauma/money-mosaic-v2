import { inject, Injectable } from '@angular/core';
import { ApiClient } from './api-client';

/**
 * `tables` is keyed by table name at runtime (`Record`, not a per-table union) so export/import
 * automatically covers every current and future table without needing this file updated whenever a
 * new one is added (FR-DAT-1, FR-DAT-2).
 */
export type AppDataExport = {
  schemaVersion: number;
  exportedAt: string;
  tables: Record<string, unknown[]>;
};

export type ImportMode = 'replace' | 'merge';

/** What the signed-in account already holds, before a browser database is moved into it. */
export type LocalMigrationState = {
  /** Rows per table, so the offer can say what it would be merging into. */
  readonly counts: Record<string, number>;
  /** Whether any of it is the user's rather than the first-run seed's. */
  readonly hasExistingData: boolean;
};

/** What a completed move actually did — mirrors `MigrationReport` in `server/src/operations/migrate-local.ts`. */
export type LocalMigrationReport = {
  readonly migrated: Record<string, number>;
  /** Rows matched to a row the account already had (a seeded category) instead of duplicated. */
  readonly reused: Record<string, number>;
  /**
   * Rows whose incoming content was dropped in favour of one the account already held — a salary
   * month recorded on both sides. Counted apart from `reused`, which means "the same row", because
   * this one means "your figures were discarded".
   */
  readonly displaced: Record<string, number>;
  /** Rows dropped because a row they cannot exist without was not in the browser database. */
  readonly skipped: Record<string, number>;
  /** Optional references cleared for the same reason. */
  readonly clearedReferences: number;
  /**
   * Local category id -> the id it was given. The trained model's `categoryIdByIndex` is a list of
   * category ids and travels separately, as bytes, so this is the one map that has to come back.
   */
  readonly categoryIds: Record<number, number>;
};

const PATH = '/data';
const MIGRATE_LOCAL_PATH = `${PATH}/migrate-local`;

/**
 * The whole-dataset three (FR-DAT-1/2/3), each one endpoint over the signed-in user's rows and each
 * one SQLite transaction (TICKET-SRV-04) — so a failure part-way through still leaves every table
 * exactly as it was, which is the property `appDb.transaction('rw', appDb.tables, …)` used to give.
 *
 * Two things that used to happen here happen server-side now: the `schemaVersion` guard (a backup
 * from a newer data model is refused **before** the transaction opens, and the refusal arrives here
 * as a rejection carrying that sentence), and the `replace`-vs-`merge` decision.
 *
 * `categoryModel` is not in the document, and never was: `JSON.stringify` turns an `ArrayBuffer`
 * into `{}`, so the export has always silently lost the trained weights (TICKET-DAT-05's closing
 * note). A `replace` import and `deleteAll` both still clear the row, because it describes a dataset
 * that is being replaced.
 */
@Injectable({ providedIn: 'root' })
export class DataManagementRepository {
  private readonly api = inject(ApiClient);

  exportAll = (): Promise<AppDataExport> => this.api.get<AppDataExport>(`${PATH}/export`);

  importAll = async (data: AppDataExport, mode: ImportMode): Promise<void> => {
    await this.api.post<void>(`${PATH}/import`, { mode, data });
  };

  deleteAll = (): Promise<void> => this.api.delete(PATH);

  /** What this account already holds — the question TICKET-SRV-07's offer is worded from. */
  localMigrationState = (): Promise<LocalMigrationState> =>
    this.api.get<LocalMigrationState>(MIGRATE_LOCAL_PATH);

  /**
   * Moves a whole browser database into this account, once (TICKET-SRV-07).
   *
   * Deliberately **not** `importAll`, even though the document is the same shape. An import
   * preserves the ids a backup carries, because they are this account's own; a browser database's
   * ids came from Dexie's `++id` in an id space that has nothing to do with this one and *will*
   * collide. The server inserts every row afresh, rewrites every reference, and answers with what
   * landed — all in one transaction, so a failure leaves the account exactly as it was.
   */
  migrateLocalDatabase = (data: AppDataExport, mode: ImportMode): Promise<LocalMigrationReport> =>
    this.api.post<LocalMigrationReport>(MIGRATE_LOCAL_PATH, { mode, data });
}
