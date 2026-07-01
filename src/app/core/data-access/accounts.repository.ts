import { Injectable } from '@angular/core';
import { appDb, type Account } from './app-db';

@Injectable({ providedIn: 'root' })
export class AccountsRepository {
  getAll = (): Promise<Account[]> => appDb.accounts.toArray();

  add = (account: Account): Promise<number> => appDb.accounts.add(account);

  update = (id: number, changes: Partial<Account>): Promise<number> =>
    appDb.accounts.update(id, changes);

  remove = (id: number): Promise<void> => appDb.accounts.delete(id);
}
