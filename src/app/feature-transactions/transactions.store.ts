import { Injectable, inject, signal } from '@angular/core';
import { TransactionsRepository, type Transaction } from '@/core/data-access';

@Injectable({ providedIn: 'root' })
export class TransactionsStore {
  private readonly transactionsRepository = inject(TransactionsRepository);

  private readonly transactionsSignal = signal<Transaction[]>([]);
  readonly transactions = this.transactionsSignal.asReadonly();

  hydrate = async (): Promise<void> => {
    this.transactionsSignal.set(await this.transactionsRepository.getAll());
  };

  addMany = (transactions: Transaction[]): void => {
    this.transactionsSignal.update((existing) => [...existing, ...transactions]);
  };

  removeMany = (ids: number[]): void => {
    const idsToRemove = new Set(ids);
    this.transactionsSignal.update((existing) =>
      existing.filter((transaction) => !idsToRemove.has(transaction.id!)),
    );
  };
}
