import { inject, Injectable } from '@angular/core';
import { ApiClient } from './api-client';
import type { Transaction } from './entities';

const PATH = '/transactions';

/**
 * The three extra reads are **query parameters on the list endpoint** rather than paths of their
 * own: each is the same "give me my transactions" question with a narrower `where`, which is how the
 * Dexie indexes behind them read too.
 *
 * There is deliberately **no `bulkRemove`**. `DELETE /api/transactions/bulk` exists, but it deletes
 * rows without repairing the transfers that linked them, leaving a surviving leg stamped with a
 * `transferId` whose row has cascaded away. `TransactionDeletionService.removeMany` — which is
 * `POST /api/transactions/delete`, cleanup included — is the only way transactions are deleted now,
 * so the method was dropped rather than ported into a trap (TICKET-SRV-04).
 */
@Injectable({ providedIn: 'root' })
export class TransactionsRepository {
  private readonly api = inject(ApiClient);

  getAll = (): Promise<Transaction[]> => this.api.get<Transaction[]>(PATH);

  count = (): Promise<number> =>
    this.api.get<{ count: number }>(`${PATH}/count`).then(({ count }) => count);

  getByAccount = (accountId: number): Promise<Transaction[]> =>
    this.api.get<Transaction[]>(PATH, { accountId });

  update = (id: number, changes: Partial<Transaction>): Promise<number> =>
    this.api.patch<Transaction>(`${PATH}/${id}`, changes).then(() => 1);

  /**
   * One batched write for N per-row changes — used by bulk category assignment (TICKET-TXN-01) and
   * by the rules engine. Resolves to the number of **rows** changed, so two updates naming the same
   * id count once, and the whole batch is a single SQLite transaction.
   */
  bulkUpdate = (updates: { id: number; changes: Partial<Transaction> }[]): Promise<number> =>
    this.api.patch<{ updated: number }>(`${PATH}/bulk`, updates).then(({ updated }) => updated);

  bulkAdd = (transactions: Transaction[]): Promise<number[]> =>
    this.api.post<{ ids: number[] }>(`${PATH}/bulk`, transactions).then(({ ids }) => ids);

  getByImportBatch = (importBatchId: number): Promise<Transaction[]> =>
    this.api.get<Transaction[]>(PATH, { importBatchId });

  getByReimbursementTransferId = (transferId: number): Promise<Transaction[]> =>
    this.api.get<Transaction[]>(PATH, { reimbursementTransferId: transferId });
}
