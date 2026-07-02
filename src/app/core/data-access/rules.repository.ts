import { Injectable } from '@angular/core';
import { appDb, type Rule } from './app-db';

@Injectable({ providedIn: 'root' })
export class RulesRepository {
  getAll = (): Promise<Rule[]> => appDb.rules.toArray();

  add = (rule: Rule): Promise<number> => appDb.rules.add(rule);

  update = (id: number, changes: Partial<Rule>): Promise<number> => appDb.rules.update(id, changes);

  remove = (id: number): Promise<void> => appDb.rules.delete(id);
}
