import { inject, Injectable } from '@angular/core';
import { ApiClient } from './api-client';
import type { Rule } from './entities';

const PATH = '/rules';

/** See `accounts.repository.ts` for the shape, and for what `update`'s `Promise<number>` means. */
@Injectable({ providedIn: 'root' })
export class RulesRepository {
  private readonly api = inject(ApiClient);

  getAll = (): Promise<Rule[]> => this.api.get<Rule[]>(PATH);

  add = (rule: Rule): Promise<number> =>
    this.api.post<{ id: number }>(PATH, rule).then(({ id }) => id);

  update = (id: number, changes: Partial<Rule>): Promise<number> =>
    this.api.patch<Rule>(`${PATH}/${id}`, changes).then(() => 1);

  remove = (id: number): Promise<void> => this.api.delete(`${PATH}/${id}`);
}
