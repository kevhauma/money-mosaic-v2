import { Injectable } from '@angular/core';
import { appDb, type Transaction } from './app-db';

@Injectable({ providedIn: 'root' })
export class TransactionsRepository {
  getAll = (): Promise<Transaction[]> => appDb.transactions.toArray();

  getByAccount = (accountId: number): Promise<Transaction[]> =>
    appDb.transactions.where('accountId').equals(accountId).toArray();

  add = (transaction: Transaction): Promise<number> => appDb.transactions.add(transaction);

  update = (id: number, changes: Partial<Transaction>): Promise<number> =>
    appDb.transactions.update(id, changes);

  remove = (id: number): Promise<void> => appDb.transactions.delete(id);
}
