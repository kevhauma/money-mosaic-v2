import { inject, Injectable } from '@angular/core';
import { ApiClient } from './api-client';
import type { Account } from './entities';

/**
 * The archetype of every repository in this folder (TICKET-SRV-05): the same four verbs it wrapped
 * a Dexie table with, now one `/api` call each. Two things about the shape are deliberate and hold
 * for all seventeen.
 *
 * **The public surface is byte-identical to the Dexie version**, down to the `Promise<number>` that
 * `update` answers with. Every caller — twenty-odd features, their stores and their specs — was
 * written against it and none of them changed. `repository-surface.spec.ts` pins the whole surface,
 * so a signature cannot drift quietly.
 *
 * **`update` resolves to 1, and a missing row rejects.** Dexie answered the count of rows changed,
 * which for a keyed update is 1 — or 0 for a key that was not there. The API answers 404 for that
 * case, so it surfaces as a rejection instead of a silent zero. Nothing in the app branches on the
 * count (checked at every caller), so the difference is visible only as an error where there used
 * to be none, which is the honest answer now the row lives somewhere another client can delete it.
 */
const PATH = '/accounts';

@Injectable({ providedIn: 'root' })
export class AccountsRepository {
  private readonly api = inject(ApiClient);

  getAll = (): Promise<Account[]> => this.api.get<Account[]>(PATH);

  add = (account: Account): Promise<number> =>
    this.api.post<{ id: number }>(PATH, account).then(({ id }) => id);

  update = (id: number, changes: Partial<Account>): Promise<number> =>
    this.api.patch<Account>(`${PATH}/${id}`, changes).then(() => 1);

  /**
   * The account **and everything hanging off it** — its transactions and every transfer that
   * touched them (TICKET-SRV-04). The cascade report the endpoint answers with is what
   * `AccountDeletionService.deleteAccount` reads; this method, whose callers only ever removed a
   * bare row, keeps ignoring it.
   */
  remove = (id: number): Promise<void> => this.api.delete(`${PATH}/${id}`);
}
