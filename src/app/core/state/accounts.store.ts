import { computed, effect, inject } from '@angular/core';
import {
  patchState,
  signalStore,
  type,
  withComputed,
  withHooks,
  withMethods,
  withState,
} from '@ngrx/signals';
import { entityConfig, removeEntity, setAllEntities, withEntities } from '@ngrx/signals/entities';
import { AccountsRepository, type Account } from '@/core/data-access';
import { AccountDeletionService } from '@/core/accounts';
import {
  computeContributorBreakdown,
  computeJointAccountStake,
  reimbursedTransferLegIds,
  resolveContribution,
  type ContributorBreakdown,
  type JointLegContext,
} from '@/core/stats';
import { savingsAccountIbans } from '@/core/transfers';
import { CategoriesStore } from './categories.store';
import { TransactionsStore } from './transactions.store';
import { TransfersStore } from './transfers.store';
import {
  computeReorderUpdates,
  sortedBySortOrder,
  withArchivable,
  withPersistedCrud,
} from '@/shared/utils';

const accountConfig = entityConfig({
  entity: type<Account>(),
  selectId: (account) => account.id!,
});

/** A joint account's opening balance counts at my stake; every other account's counts in full. */
const weightedOpeningBalance = (account: Account): number =>
  account.openingBalance * (account.type === 'joint' ? (account.ownershipShare ?? 1) : 1);

export const AccountsStore = signalStore(
  { providedIn: 'root' },
  withEntities(accountConfig),
  withArchivable<Account>(),
  // add/update are plain CRUD (TICKET-NG-08); removeAccount stays hand-rolled below since it
  // cascades through AccountDeletionService instead of a plain repository call.
  withPersistedCrud(AccountsRepository, accountConfig),
  withComputed(({ entities, activeEntities, archivedEntities }) => {
    const transactionsStore = inject(TransactionsStore);
    const transfersStore = inject(TransfersStore);
    const categoriesStore = inject(CategoriesStore);

    const transactionTotalsByAccountId = computed(() => {
      const totals = new Map<number, number>();
      for (const transaction of transactionsStore.transactions()) {
        totals.set(
          transaction.accountId,
          (totals.get(transaction.accountId) ?? 0) + transaction.amount,
        );
      }
      return totals;
    });

    // Real bank balance (unchanged by the contribution model) — the accounts UI keeps showing
    // this figure for every account, joint included (TICKET-STAT-46).
    const balancesById = computed(() => {
      const totals = transactionTotalsByAccountId();
      return new Map(
        entities().map((account) => [
          account.id!,
          account.openingBalance + (totals.get(account.id!) ?? 0),
        ]),
      );
    });

    const accountsById = computed(
      () => new Map(entities().map((account) => [account.id!, account])),
    );

    // Shared lookup context for classifying a joint account's own transaction legs
    // (TICKET-STAT-46) — reused by both the stake and the contributor-breakdown computeds below.
    const jointLegContext = computed((): JointLegContext => ({
      transactionsById: new Map(transactionsStore.transactions().map((t) => [t.id!, t])),
      accountsById: accountsById(),
      transfersById: transfersStore.transferByTransactionId(),
      categoriesById: categoriesStore.categoriesById(),
    }));

    // My net-worth stake in each joint account (my share of the pot, not the full balance) — the
    // "your share" figure surfaced on the accounts UI and folded into `netWorth` below.
    const jointAccountStakeById = computed(() => {
      const context = jointLegContext();
      const transactions = transactionsStore.transactions();
      const stakes = new Map<number, number>();
      for (const account of entities()) {
        if (account.type !== 'joint') continue;
        stakes.set(account.id!, computeJointAccountStake(transactions, account, context));
      }
      return stakes;
    });

    // Per-contributor inflow breakdown for each joint account (mine / each co-owner / unattributed).
    const contributorBreakdownById = computed(() => {
      const context = jointLegContext();
      const transactions = transactionsStore.transactions();
      const breakdowns = new Map<number, ContributorBreakdown>();
      for (const account of entities()) {
        if (account.type !== 'joint') continue;
        breakdowns.set(account.id!, computeContributorBreakdown(transactions, account, context));
      }
      return breakdowns;
    });

    /**
     * Combined net worth (FR-STAT-1), kept **per account** (TICKET-FUT-08): non-joint accounts
     * count their full balance, a joint account only my stake. Walked per-transaction (rather than
     * summing `balancesById`/`jointAccountStakeById`) so a manual `attributionOverride` on a
     * *non-joint* account's transaction is honoured too (TICKET-TXN-03).
     *
     * Every term is attributable to one `accountId`, so keeping it per account is an extraction
     * rather than a second model — and `netWorth` below is literally the sum of these, which is
     * what makes a scoped forecast total incapable of drifting from the Dashboard's card.
     *
     * Deliberately *not* `balancesById` + `jointAccountStakeById`: those come from two different
     * computations (real bank balance, and contributions minus a share of spending), and adding them
     * would produce a figure that disagrees with this one — the trap TICKET-ACC-07 recorded.
     */
    const netWorthContributionById = computed(() => {
      const context = jointLegContext();
      const transactions = transactionsStore.transactions();
      const suppressed = reimbursedTransferLegIds(transactions, context.transfersById);

      const contributions = new Map<number, number>(
        entities().map((account) => [account.id!, weightedOpeningBalance(account)]),
      );
      for (const transaction of transactions) {
        const account = context.accountsById.get(transaction.accountId);
        if (!account) continue;
        const weight = resolveContribution(transaction, account, context, suppressed).weight;
        contributions.set(account.id!, (contributions.get(account.id!) ?? 0) + weight);
      }
      return contributions;
    });

    const netWorth = computed(() =>
      [...netWorthContributionById().values()].reduce((sum, value) => sum + value, 0),
    );

    return {
      accounts: sortedBySortOrder(entities),
      activeAccounts: sortedBySortOrder(activeEntities),
      archivedAccounts: archivedEntities,
      accountsById,
      balancesById,
      netWorth,
      netWorthContributionById,
      jointAccountStakeById,
      contributorBreakdownById,
      /**
       * `TransactionsStore`/`TransfersStore` hydrate in the background without blocking app
       * bootstrap (TICKET-PERF-05) — `balancesById`/`netWorth`/etc. above fold in both, so views
       * reading them gate on this instead of briefly showing opening-balance-only figures as final.
       */
      dataReady: computed(() => transactionsStore.hydrated() && transfersStore.hydrated()),
      transactionCountById: computed(() => {
        const counts = new Map<number, number>();
        for (const transaction of transactionsStore.transactions()) {
          counts.set(transaction.accountId, (counts.get(transaction.accountId) ?? 0) + 1);
        }
        return counts;
      }),
    };
  }),
  withState({ hydrated: false }),
  withMethods((store) => {
    const accountsRepository = inject(AccountsRepository);
    const accountDeletionService = inject(AccountDeletionService);
    const transactionsStore = inject(TransactionsStore);
    const transfersStore = inject(TransfersStore);
    let hydration: Promise<void> | null = null;

    /**
     * Idempotent; triggered on first injection (`withHooks` below, TICKET-PERF-07). `force: true`
     * re-fetches even after a prior hydrate already resolved — used by the dev seed to refresh
     * state after writing new rows directly through the repository (matching
     * `TransactionsStore`/`TransfersStore`'s established pattern, TICKET-PERF-05).
     */
    const hydrate = (options?: { force?: boolean }): Promise<void> => {
      if (!hydration || options?.force) {
        hydration = accountsRepository.getAll().then((accounts) => {
          patchState(store, setAllEntities(accounts, accountConfig), { hydrated: true });
        });
      }
      return hydration;
    };

    return {
      hydrate,

      // Aliased to the store's own public method names (same pattern as `withArchivable`'s
      // `activeEntities`/`archivedEntities` -> `activeAccounts`/`archivedAccounts`).
      addAccount: (account: Account): Promise<Account> => store.add(account),
      updateAccount: (id: number, changes: Partial<Account>): Promise<void> =>
        store.update(id, changes),

      /**
       * Cascades the delete: the account, its transactions, and any transfer links touching them are
       * removed in one atomic write (CR-1.1), then mirrored into the transactions/transfers stores so
       * no orphaned rows keep skewing stats or net worth.
       */
      removeAccount: async (id: number): Promise<void> => {
        const { removedTransactionIds, unlinkedTransferIds, clearedTransferTransactionIds } =
          await accountDeletionService.deleteAccount(id);

        patchState(store, removeEntity(id));
        transactionsStore.removeMany(removedTransactionIds);
        transactionsStore.patchMany(
          clearedTransferTransactionIds.map((txId) => ({
            id: txId,
            changes: { transferId: undefined },
          })),
        );
        transfersStore.removeLocal(unlinkedTransferIds);
      },

      /**
       * Wipes an account's transactions (and the transfer links touching them) in one atomic write
       * (CR-1.1) while keeping the account row and its settings/mapping profiles intact
       * (TICKET-ACC-01), then mirrors the changes into the transactions/transfers stores so
       * balancesById/netWorth/transactionCountById recompute immediately (FR-STAT-5).
       */
      clearTransactions: async (id: number): Promise<void> => {
        const { removedTransactionIds, unlinkedTransferIds, clearedTransferTransactionIds } =
          await accountDeletionService.clearTransactions(id);

        transactionsStore.removeMany(removedTransactionIds);
        transactionsStore.patchMany(
          clearedTransferTransactionIds.map((txId) => ({
            id: txId,
            changes: { transferId: undefined },
          })),
        );
        transfersStore.removeLocal(unlinkedTransferIds);
      },
    };
  }),
  withMethods((store) => ({
    archiveAccount: (id: number): Promise<void> => store.updateAccount(id, { archived: true }),
    unarchiveAccount: (id: number): Promise<void> => store.updateAccount(id, { archived: false }),

    /** Moves an account earlier/later in display order by swapping its sortOrder with its neighbour (TICKET-ACC-04). */
    moveAccount: async (id: number, direction: 'up' | 'down'): Promise<void> => {
      const updates = computeReorderUpdates(store.accounts(), id, direction);
      await Promise.all(
        updates.map((update) => store.updateAccount(update.id, { sortOrder: update.sortOrder })),
      );
    },
  })),
  withHooks({
    onInit(store) {
      // Fire-and-forget: kicks off hydration the moment anything first injects this store,
      // instead of at app bootstrap (TICKET-PERF-07). Idempotent, so flows that read
      // `accounts()` synchronously can still `await store.hydrate()` as a guard.
      void store.hydrate();

      const transactionsStore = inject(TransactionsStore);
      // Push savings-account IBANs down into TransactionsStore so its categorisation backlog can drop
      // money moved into savings, without TransactionsStore importing AccountsStore (which would create
      // a DI cycle — AccountsStore already depends on TransactionsStore) (TICKET-TRF-02).
      effect(() => {
        transactionsStore.setOwnSavingsIbans(savingsAccountIbans(store.accounts()));
      });
    },
  }),
);
