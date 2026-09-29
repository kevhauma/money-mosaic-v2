import { Injectable } from '@angular/core';
import { listedLocalDatabase } from './local-database-name';
import type { LocalDatabaseSnapshot, LocalDatabaseSummary } from './local-database';

/**
 * The seam between the migration service and Dexie (TICKET-SRV-07).
 *
 * Two jobs, and each is the reason the other could not just be a direct import:
 *
 * 1. **It keeps Dexie out of every chunk but one.** `local-database.ts` is reached through a
 *    dynamic `import()`, so the ~90 kB of Dexie and the last copy of the v1→v16 schema history are
 *    downloaded only by a browser that actually still has a database to move. On a machine that
 *    never had one, `listedLocalDatabase()` answers "no" and nothing is loaded at all.
 * 2. **It gives the service something a spec can replace.** A dynamic import is not injectable;
 *    this class is, so `local-migration.service.spec.ts` provides a fake and never needs a real
 *    IndexedDB.
 *
 * TICKET-SRV-08 deletes this whole folder along with `app-db.ts`.
 */
@Injectable({ providedIn: 'root' })
export class LocalDatabaseGateway {
  /** What is in the browser database, or `null` when there is none or it holds nothing. */
  summary = async (): Promise<LocalDatabaseSummary | null> => {
    // A definite "no" from the listing API is the end of it — and the common case, which is the
    // whole point of asking a question that costs no download to answer.
    if ((await listedLocalDatabase()) === false) return null;

    const { readLocalDatabaseSummary } = await import('./local-database');
    return readLocalDatabaseSummary();
  };

  read = async (): Promise<LocalDatabaseSnapshot> => {
    const { readLocalDatabase } = await import('./local-database');
    return readLocalDatabase();
  };

  remove = async (): Promise<void> => {
    const { deleteLocalDatabase } = await import('./local-database');
    return deleteLocalDatabase();
  };
}
