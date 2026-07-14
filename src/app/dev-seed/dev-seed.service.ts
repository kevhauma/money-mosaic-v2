import { Injectable, inject, isDevMode } from '@angular/core';
import { AccountsRepository, TransactionsRepository, type Transaction } from '@/core/data-access';
import { partitionByFingerprint } from '@/core/import';
import { TransferLinkingService } from '@/core/transfers';
import { AccountsStore, TransactionsStore, TransfersStore, CategoriesStore } from '@/core/state';
import {
  buildSeedAccounts,
  buildSeedTransactions,
  shouldSeed,
  type SeedTransaction,
} from './dev-seed';

/**
 * Dev-only sample-data seed (TICKET-DEV-01). Reached solely through a dynamic import behind an
 * `isDevMode()` guard in app.config.ts, so it (and its dataset) tree-shake out of the production
 * bundle. Writes go through the repository/store layer — never direct `appDb` table writes — so the
 * hydrated stores reflect the seeded rows without a reload.
 */
@Injectable({ providedIn: 'root' })
export class DevSeedService {
  private readonly accountsRepository = inject(AccountsRepository);
  private readonly transactionsRepository = inject(TransactionsRepository);
  private readonly transferLinkingService = inject(TransferLinkingService);
  private readonly accountsStore = inject(AccountsStore);
  private readonly transactionsStore = inject(TransactionsStore);
  private readonly transfersStore = inject(TransfersStore);
  private readonly categoriesStore = inject(CategoriesStore);

  /**
   * Seeds the sample dataset iff we're in dev mode and the database has zero accounts and zero
   * transactions. Idempotent and non-destructive: on any existing dataset it's a no-op.
   * Returns the number of transactions written (0 when skipped).
   */
  seedIfEmpty = async (now: Date = new Date()): Promise<number> => {
    const [accounts, transactionCount] = await Promise.all([
      this.accountsRepository.getAll(),
      this.transactionsRepository.count(),
    ]);

    if (
      !shouldSeed({
        isDevMode: isDevMode(),
        accountCount: accounts.length,
        transactionCount,
      })
    ) {
      return 0;
    }

    const accountIds = await this.insertAccounts(now);
    const categoryIdByName = new Map(
      this.categoriesStore.categories().map((category) => [category.name, category.id!]),
    );

    const { transactions, transferPairIndices } = buildSeedTransactions(
      accountIds,
      categoryIdByName,
      now,
    );

    const persisted = await this.insertTransactions(transactions);
    await this.linkTransfers(persisted, transferPairIndices);

    // Re-hydrate every store the seed touched so the UI reflects the new rows without a reload.
    await Promise.all([
      this.accountsStore.hydrate(),
      this.transactionsStore.hydrate(),
      this.transfersStore.hydrate(),
    ]);

    return persisted.length;
  };

  private insertAccounts = async (now: Date): Promise<[number, number]> => {
    const [checking, savings] = buildSeedAccounts(now);
    const checkingId = await this.accountsRepository.add(checking);
    const savingsId = await this.accountsRepository.add(savings);
    return [checkingId, savingsId];
  };

  /**
   * Finalises each base fingerprint into the stored `<base>|<occurrence>` form via the same
   * `partitionByFingerprint` an import uses (against an empty history), so seeded rows carry the
   * exact same fingerprint invariant as imported rows, then bulk-inserts and returns the rows with
   * their assigned ids in order.
   */
  private insertTransactions = async (transactions: SeedTransaction[]): Promise<Transaction[]> => {
    const { accepted } = partitionByFingerprint(transactions, new Set<string>());
    const ids = await this.transactionsRepository.bulkAdd(accepted);
    return accepted.map((transaction, index) => ({ ...transaction, id: ids[index] }));
  };

  private linkTransfers = async (
    persisted: Transaction[],
    transferPairIndices: [number, number][],
  ): Promise<void> => {
    for (const [fromIndex, toIndex] of transferPairIndices) {
      await this.transferLinkingService.linkAuto(
        persisted[fromIndex],
        persisted[toIndex],
        'auto-iban',
        'high',
      );
    }
  };
}
