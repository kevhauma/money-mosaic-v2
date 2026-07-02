import { Injectable } from '@angular/core';
import { appDb, type Category } from './app-db';

@Injectable({ providedIn: 'root' })
export class CategoriesRepository {
  getAll = (): Promise<Category[]> => appDb.categories.toArray();

  add = (category: Category): Promise<number> => appDb.categories.add(category);

  update = (id: number, changes: Partial<Category>): Promise<number> =>
    appDb.categories.update(id, changes);

  remove = (id: number): Promise<void> => appDb.categories.delete(id);
}
