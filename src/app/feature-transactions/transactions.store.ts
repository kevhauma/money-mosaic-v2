import { Injectable, computed, inject, signal } from '@angular/core';
import { TransactionsRepository, type Transaction } from '@/core/data-access';

@Injectable({ providedIn: 'root' })
export class TransactionsStore {
  private readonly transactionsRepository = inject(TransactionsRepository);

  private readonly transactionsSignal = signal<Transaction[]>([]);
  readonly transactions = this.transactionsSignal.asReadonly();

  /** Surfaces the categorisation backlog so it's never quietly lost (FR-CAT-5). */
  readonly uncategorisedTransactions = computed(() =>
    this.transactionsSignal().filter((transaction) => transaction.categoryId == null),
  );

  readonly uncategorisedCount = computed(() => this.uncategorisedTransactions().length);

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

  updateTransaction = async (id: number, changes: Partial<Transaction>): Promise<void> => {
    await this.transactionsRepository.update(id, changes);
    this.patchMany([{ id, changes }]);
  };

  /** Reflects changes already persisted elsewhere (e.g. an atomic multi-transaction write) into local state. */
  patchMany = (updates: { id: number; changes: Partial<Transaction> }[]): void => {
    const changesById = new Map(updates.map((update) => [update.id, update.changes]));
    this.transactionsSignal.update((existing) =>
      existing.map((transaction) =>
        changesById.has(transaction.id!)
          ? { ...transaction, ...changesById.get(transaction.id!) }
          : transaction,
      ),
    );
  };
}
