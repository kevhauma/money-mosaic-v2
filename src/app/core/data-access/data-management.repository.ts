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

const PATH = '/data';

/**
 * The whole-dataset three (FR-DAT-1/2/3), each one endpoint over the signed-in user's rows and each
 * one SQLite transaction (TICKET-SRV-04) — so a failure part-way through still leaves every table
 * exactly as it was, which is the property the browser database's own all-tables write transaction
 * used to give before TICKET-SRV-05.
 *
 * Two things that used to happen here happen server-side now: the `schemaVersion` guard (a backup
 * from a newer data model is refused **before** the transaction opens, and the refusal arrives here
 * as a rejection carrying that sentence), and the `replace`-vs-`merge` decision.
 *
 * `categoryModel` is not in the document, and never was: `JSON.stringify` turns an `ArrayBuffer`
 * into `{}`, so the export has always silently lost the trained weights (TICKET-DAT-05's closing
 * note). A `replace` import and `deleteAll` both still clear the row, because it describes a dataset
 * that is being replaced.
 *
 * **`importAll` is two requests** (TICKET-SRV-11): the document's bytes are staged to a file on the
 * server, and a second, tiny request names that file and says `replace` or `merge`. It stays one
 * method because the split is transport, not behaviour — the dialog, the QR receive path and the
 * `schemaVersion` guard all see exactly what they saw when it was one POST, including the rejection
 * sentence, which still arrives from the apply step.
 */
@Injectable({ providedIn: 'root' })
export class DataManagementRepository {
  private readonly api = inject(ApiClient);

  exportAll = (): Promise<AppDataExport> => this.api.get<AppDataExport>(`${PATH}/export`);

  importAll = async (data: AppDataExport, mode: ImportMode): Promise<void> => {
    // A `Blob` rather than a string, so the request carries a `Content-Length` the server can refuse
    // on before reading a byte — which is what makes an over-sized restore fail with a sentence
    // instead of a reset connection.
    const document = new Blob([JSON.stringify(data)], { type: 'application/octet-stream' });
    const { uploadId } = await this.api.postBytes<{ uploadId: string }>(
      `${PATH}/import/staged`,
      document,
    );

    await this.api.post<void>(`${PATH}/import`, { mode, uploadId });
  };

  deleteAll = (): Promise<void> => this.api.delete(PATH);
}
