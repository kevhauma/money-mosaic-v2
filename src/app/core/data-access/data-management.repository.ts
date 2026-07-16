import { Injectable } from '@angular/core';
import { appDb } from './app-db';

/**
 * `tables` is keyed by table name at runtime (`Record`, not a per-table union) so export/import
 * automatically covers every current and future `appDb` table without needing this file updated
 * whenever a new table is added (FR-DAT-1, FR-DAT-2).
 */
export type AppDataExport = {
  schemaVersion: number;
  exportedAt: string;
  tables: Record<string, unknown[]>;
};

export type ImportMode = 'replace' | 'merge';

@Injectable({ providedIn: 'root' })
export class DataManagementRepository {
  /** Reads every `appDb` table inside one read transaction (NFR-STORE-1 records the schema version). */
  exportAll = async (): Promise<AppDataExport> => {
    const tables: Record<string, unknown[]> = {};
    await appDb.transaction('r', appDb.tables, async () => {
      for (const table of appDb.tables) {
        tables[table.name] = await table.toArray();
      }
    });
    return { schemaVersion: appDb.verno, exportedAt: new Date().toISOString(), tables };
  };

  /**
   * `replace` clears every table before repopulating; `merge` upserts without clearing. Both modes
   * use `bulkPut` (not `bulkAdd`) so imported rows keep their original ids and cross-table foreign
   * keys (`accountId`/`categoryId`/`transferId`/...) stay valid. The schema-version check runs before
   * the transaction opens, and the whole write is one `appDb.transaction('rw', ...)` so a failure
   * partway through leaves every table exactly as it was (NFR-RESIL-1) — Dexie rolls back the entire
   * transaction on any thrown error.
   */
  importAll = async (data: AppDataExport, mode: ImportMode): Promise<void> => {
    if (data.schemaVersion > appDb.verno) {
      throw new Error(
        `This backup was created with a newer database schema (v${data.schemaVersion}) than this app supports (v${appDb.verno}). Update the app before importing.`,
      );
    }

    await appDb.transaction('rw', appDb.tables, async () => {
      for (const table of appDb.tables) {
        const rows = data.tables[table.name];
        if (mode === 'replace') {
          await table.clear();
        }
        if (rows?.length) {
          await table.bulkPut(rows);
        }
      }
    });
  };
}
