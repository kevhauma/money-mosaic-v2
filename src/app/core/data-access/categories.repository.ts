import { Injectable } from '@angular/core';
import { appDb, type Category } from './app-db';

@Injectable({ providedIn: 'root' })
export class CategoriesRepository {
  getAll = (): Promise<Category[]> => appDb.categories.toArray();
}
