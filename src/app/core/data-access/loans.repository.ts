import { inject, Injectable } from '@angular/core';
import { ApiClient } from './api-client';
import type { Loan } from './entities';

const PATH = '/loans';

/** See `accounts.repository.ts` for the shape, and for what `update`'s `Promise<number>` means. */
@Injectable({ providedIn: 'root' })
export class LoansRepository {
  private readonly api = inject(ApiClient);

  getAll = (): Promise<Loan[]> => this.api.get<Loan[]>(PATH);

  add = (loan: Loan): Promise<number> =>
    this.api.post<{ id: number }>(PATH, loan).then(({ id }) => id);

  update = (id: number, changes: Partial<Loan>): Promise<number> =>
    this.api.patch<Loan>(`${PATH}/${id}`, changes).then(() => 1);

  remove = (id: number): Promise<void> => this.api.delete(`${PATH}/${id}`);
}
