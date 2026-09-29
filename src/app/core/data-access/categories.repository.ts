import { inject, Injectable } from '@angular/core';
import { ApiClient } from './api-client';
import type { Category } from './entities';

const PATH = '/categories';

/** See `accounts.repository.ts` for the shape, and for what `update`'s `Promise<number>` means. */
@Injectable({ providedIn: 'root' })
export class CategoriesRepository {
  private readonly api = inject(ApiClient);

  getAll = (): Promise<Category[]> => this.api.get<Category[]>(PATH);

  add = (category: Category): Promise<number> =>
    this.api.post<{ id: number }>(PATH, category).then(({ id }) => id);

  update = (id: number, changes: Partial<Category>): Promise<number> =>
    this.api.patch<Category>(`${PATH}/${id}`, changes).then(() => 1);

  /**
   * Refused with a 409 naming the loans that still track this category (TICKET-SRV-04), which
   * arrives here as a rejection carrying that sentence. The endpoint also clears `categoryId` *and*
   * `categoryManual` off the category's transactions, which is what `CategoriesStore.removeCategory`
   * has always done alongside the delete.
   */
  remove = (id: number): Promise<void> => this.api.delete(`${PATH}/${id}`);
}
