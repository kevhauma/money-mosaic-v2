import { Injectable, inject } from '@angular/core';
import {
  AccountsRepository,
  CategoriesRepository,
  PARTNER_CONTRIBUTION_CATEGORY_NAME,
  TransactionsRepository,
  type Account,
  type Category,
  type Transaction,
} from '@/core/data-access';
import {
  resolveCoOwnerContributionUpdates,
  type CoOwnerContributionUpdate,
} from './co-owner-contribution';

@Injectable({ providedIn: 'root' })
export class CoOwnerContributionService {
  private readonly accountsRepository = inject(AccountsRepository);
  private readonly categoriesRepository = inject(CategoriesRepository);
  private readonly transactionsRepository = inject(TransactionsRepository);

  applyToTransactions = (
    transactions: Transaction[],
    accounts: Account[],
    categories: Category[],
  ): CoOwnerContributionUpdate[] => {
    const partnerContribution = categories.find(
      (category) => category.isSystem && category.name === PARTNER_CONTRIBUTION_CATEGORY_NAME,
    );
    if (partnerContribution?.id == null) return [];

    const accountsById = new Map(accounts.map((account) => [account.id!, account]));
    return resolveCoOwnerContributionUpdates(transactions, accountsById, partnerContribution.id);
  };

  runAndPersist = async (transactions: Transaction[]): Promise<CoOwnerContributionUpdate[]> => {
    const [accounts, categories] = await Promise.all([
      this.accountsRepository.getAll(),
      this.categoriesRepository.getAll(),
    ]);
    const updates = this.applyToTransactions(transactions, accounts, categories);
    // One transactional endpoint, not one PATCH per transaction (TICKET-SRV-05). As a `Promise.all`
    // over Dexie this was N cheap local writes; over HTTP it is N round trips, and a failure partway
    // through would leave the import half-categorised with nothing saying which half.
    await this.transactionsRepository.bulkUpdate(
      updates.map(({ id, categoryId }) => ({ id, changes: { categoryId } })),
    );
    return updates;
  };
}
