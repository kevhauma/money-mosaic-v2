import { Injectable } from '@angular/core';
import { appDb, type Loan } from './app-db';

@Injectable({ providedIn: 'root' })
export class LoansRepository {
  getAll = (): Promise<Loan[]> => appDb.loans.toArray();

  add = (loan: Loan): Promise<number> => appDb.loans.add(loan);

  update = (id: number, changes: Partial<Loan>): Promise<number> => appDb.loans.update(id, changes);

  remove = (id: number): Promise<void> => appDb.loans.delete(id);
}
