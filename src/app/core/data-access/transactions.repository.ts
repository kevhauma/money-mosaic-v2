import { Injectable } from '@angular/core';
import { appDb, type Transaction } from './app-db';

@Injectable({ providedIn: 'root' })
export class TransactionsRepository {
  getAll = (): Promise<Transaction[]> => appDb.transactions.toArray();

  count = (): Promise<number> => appDb.transactions.count();

  getByAccount = (accountId: number): Promise<Transaction[]> =>
    appDb.transactions.where('accountId').equals(accountId).toArray();

  update = (id: number, changes: Partial<Transaction>): Promise<number> =>
    appDb.transactions.update(id, changes);

  /** One batched write for N per-row changes — used by bulk category assignment (TICKET-TXN-01). */
  bulkUpdate = (updates: { id: number; changes: Partial<Transaction> }[]): Promise<number> =>
    appDb.transactions.bulkUpdate(updates.map(({ id, changes }) => ({ key: id, changes })));

  bulkAdd = (transactions: Transaction[]): Promise<number[]> =>
    appDb.transactions.bulkAdd(transactions, { allKeys: true });

  // `importBatchId` has no Dexie index (added after v1 shipped), so this is a full-table filter scan.
  getByImportBatch = (importBatchId: number): Promise<Transaction[]> =>
    appDb.transactions
      .filter((transaction) => transaction.importBatchId === importBatchId)
      .toArray();

  bulkRemove = (ids: number[]): Promise<void> => appDb.transactions.bulkDelete(ids);
}
