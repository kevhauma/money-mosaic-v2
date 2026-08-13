import { computed, inject } from '@angular/core';
import { signalStore, withComputed } from '@ngrx/signals';
import { computeGoalAffordability, computeSavingVelocity } from '@/core/stats';
import { savingsAccountIbans } from '@/core/transfers';
import {
  AccountsStore,
  CategoriesStore,
  ForecastSettingsStore,
  GoalsStore,
  TransactionsStore,
} from '@/core/state';

const todayIso = (): string => new Date().toISOString().slice(0, 10);

/**
 * The `/future` page's shared derivation (TICKET-FUT-05) — `StatsStore`'s shape: pure `computed()`
 * over the entity stores, no local state and no repository of its own, so an edited transaction or
 * a dragged goal flows straight through with no manual invalidation.
 *
 * It exists so the measured velocity and the affordability walk are computed **once per page**
 * rather than once per section: FUT-07's chart reads the same numbers the goals list does, and two
 * sections deriving them separately is exactly how two parts of a page start disagreeing.
 *
 * Lives in `feature-future/` rather than `core/state/` by the placement rule — one feature touches
 * it (the `RecurringSeriesStore`/`StatsStore` precedent).
 *
 * `today` is resolved here and passed into the aggregates, which stay clock-free.
 */
export const ForecastStore = signalStore(
  { providedIn: 'root' },
  withComputed(() => {
    const transactionsStore = inject(TransactionsStore);
    const accountsStore = inject(AccountsStore);
    const categoriesStore = inject(CategoriesStore);
    const goalsStore = inject(GoalsStore);
    const forecastSettingsStore = inject(ForecastSettingsStore);

    const velocity = computed(() =>
      computeSavingVelocity(transactionsStore.transactions(), {
        today: todayIso(),
        lookbackMonths: forecastSettingsStore.lookbackMonths(),
        basis: forecastSettingsStore.basis(),
        ownSavingsIbans: savingsAccountIbans(accountsStore.accounts()),
        categoriesById: categoriesStore.categoriesById(),
        accountsById: accountsStore.accountsById(),
      }),
    );

    /**
     * What the plan may actually spend: the Dashboard's own net-worth figure, less the floor the
     * user set. `AccountsStore.netWorth()` is the single source for "how much do I have" — this
     * page never derives a second one.
     */
    const spendableBalance = computed(
      () => accountsStore.netWorth() - forecastSettingsStore.safetyNetAmount(),
    );

    const affordability = computed(() =>
      computeGoalAffordability(goalsStore.activeGoals(), {
        today: todayIso(),
        startingBalance: accountsStore.netWorth(),
        safetyNetAmount: forecastSettingsStore.safetyNetAmount(),
        perMonth: velocity().perMonth,
      }),
    );

    return {
      velocity,
      spendableBalance,
      affordability,
      affordabilityByGoalId: computed(
        () => new Map(affordability().map((entry) => [entry.goalId, entry])),
      ),
      /** Gates every figure on the page: an opening-balance-only net worth is not a forecast. */
      dataReady: accountsStore.dataReady,
    };
  }),
);
