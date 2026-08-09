import { computed, inject } from '@angular/core';
import { signalStore, withComputed } from '@ngrx/signals';
import { detectRecurringPayments } from '@/core/stats';
import { savingsAccountIbans } from '@/core/transfers';
import { AccountsStore, CategoriesStore, TransactionsStore } from '@/core/state';

const todayIso = (): string => new Date().toISOString().slice(0, 10);

/**
 * The recurring series every section of the Recurring track reads (FR-REC-1) — detection over the
 * **whole** transaction history, derived once and shared, rather than recomputed by each panel that
 * happens to want it.
 *
 * It exists because `/explore` grew a second consumer: the recurring payments panel (TICKET-REC-02)
 * and the bills calendar (TICKET-REC-03) both need the identical detection with the identical
 * arguments, and TICKET-REC-04's flags will make it three. That is exactly the condition the
 * Explore page's "no store, on purpose" note reserved a store for — state (here, a derivation)
 * genuinely shared *between* the page's sections — so it is no longer an omission.
 *
 * Pure `computed()` derivation, no state and no methods, the `StatsStore` shape: importing a
 * transaction updates `TransactionsStore` and flows straight through with no invalidation. Snapshotting
 * `today` here also settles it for every consumer at once, so two sections can never disagree about
 * where the history ends.
 *
 * Lives in `feature-explore` rather than `core/state` because only this feature consumes it; move
 * it if a Dashboard card ever wants the same series.
 */
export const RecurringSeriesStore = signalStore(
  { providedIn: 'root' },
  withComputed(() => {
    const transactionsStore = inject(TransactionsStore);
    const categoriesStore = inject(CategoriesStore);
    const accountsStore = inject(AccountsStore);

    const today = todayIso();

    const detected = computed(() =>
      detectRecurringPayments(
        transactionsStore.transactions(),
        categoriesStore.categoriesById(),
        accountsStore.accountsById(),
        today,
        savingsAccountIbans(accountsStore.accounts()),
      ),
    );

    const series = computed(() => detected().series);

    return {
      series,
      /**
       * Series left out because their category's applicability window had closed (TICKET-REC-05).
       * Shared so the panel can caption the absence — a series disappearing without a word is the
       * one thing this feature's "announce, don't vanish" rule (REC-04) does not allow.
       */
      concludedSeriesCount: computed(() => detected().concludedSeriesCount),
      /**
       * The series still running — everything except those flagged `stopped` (TICKET-REC-04).
       * Shared rather than filtered twice: the panel excludes stopped series from its count and
       * monthly total, and the bills calendar must not keep projecting a cancelled subscription
       * onto future days, or the two sections of one page would contradict each other.
       */
      activeSeries: computed(() => series().filter((entry) => entry.flags.stopped === undefined)),
      /** The date detection treated as "now" — consumers project forward from the same instant. */
      today: computed(() => today),
      hasSeries: computed(() => series().length > 0),
    };
  }),
);
