import { computed, inject } from '@angular/core';
import { signalStore, withComputed } from '@ngrx/signals';
import type { SavingsGoal } from '@/core/data-access';
import {
  computeGoalAffordability,
  computeNetWorthProjection,
  computeRequiredSavingRate,
  computeSavingVelocity,
  type GoalAffordability,
  type ProjectedPurchase,
  type SavingBasis,
} from '@/core/stats';
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
 * One affordability verdict turned into a purchase the chart can draw. A goal that is affordable
 * *today* has no `affordableOn`, so it lands on `fallbackDate` — see `plottablePurchases` below for
 * why it has to land somewhere rather than being skipped.
 */
const toProjectedPurchase = (
  entry: GoalAffordability,
  goal: SavingsGoal,
  fallbackDate: string,
): ProjectedPurchase => ({
  goalId: entry.goalId,
  name: goal.name,
  amount: goal.targetAmount,
  on: entry.affordableOn ?? fallbackDate,
});

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

    /**
     * The accounts the forecast may be scoped to: own **savings** accounts only, plus an archived
     * one that still carries a net-worth contribution — money that is still counted has to be
     * excludable.
     *
     * Narrowing the offer to savings accounts is what makes the scope answer a question worth
     * asking: "how fast is the money I actually set aside growing", measured on the accounts it
     * lands in. A checking account in the scope answers "what is left in my current account",
     * which the Dashboard already covers and which nothing on this page projects usefully.
     */
    const scopeCandidates = computed(() => {
      const contributions = accountsStore.netWorthContributionById();
      return accountsStore
        .accounts()
        .filter((account) => account.type === 'savings')
        .filter((account) => !account.archived || contributions.get(account.id!));
    });

    /**
     * The chosen accounts that are still offerable (TICKET-FUT-08) — an id left behind by a deleted
     * account, or by a scope stored before the offer narrowed to savings, is dropped on read rather
     * than staying invisibly active, and an empty result means "all accounts", exactly as an unset
     * scope does.
     */
    const scopeAccountIds = computed(() => {
      const candidates = new Set(scopeCandidates().map((account) => account.id!));
      return new Set(
        forecastSettingsStore.activeScopeAccountIds().filter((id) => candidates.has(id)),
      );
    });

    /**
     * What the page actually measures on. The user's basis holds for an unscoped forecast, but a
     * scope is always a set of savings accounts — and `savings-transfers` counts money moved *into*
     * own savings accounts, which from inside those accounts is nothing at all. Reading a scoped
     * forecast on that basis would report ~€0/month for someone saving steadily, so the scope fixes
     * the basis at net cash flow: everything that came into the selected accounts, minus everything
     * that left. The stored preference is untouched and returns the moment the scope is cleared.
     */
    const effectiveBasis = computed<SavingBasis>(() =>
      scopeAccountIds().size ? 'net-cash-flow' : forecastSettingsStore.basis(),
    );

    const velocity = computed(() =>
      computeSavingVelocity(transactionsStore.transactions(), {
        today: todayIso(),
        lookbackMonths: forecastSettingsStore.lookbackMonths(),
        basis: effectiveBasis(),
        ownSavingsIbans: savingsAccountIbans(accountsStore.accounts()),
        categoriesById: categoriesStore.categoriesById(),
        accountsById: accountsStore.accountsById(),
        scopeAccountIds: scopeAccountIds(),
      }),
    );

    /**
     * What the plan starts from: the scoped accounts' own net-worth contributions, or — with no
     * scope — `AccountsStore.netWorth()` itself. Equal by construction rather than by coincidence,
     * since `netWorth` *is* the sum of that map.
     */
    const startingBalance = computed(() => {
      const scope = scopeAccountIds();
      if (scope.size === 0) return accountsStore.netWorth();

      let total = 0;
      for (const [accountId, contribution] of accountsStore.netWorthContributionById()) {
        if (scope.has(accountId)) total += contribution;
      }
      return total;
    });

    /** "Savings + Buffer only" — `''` when the forecast is looking at everything. */
    const scopeLabel = computed(() => {
      const scope = scopeAccountIds();
      if (scope.size === 0) return '';
      return accountsStore
        .accounts()
        .filter((account) => scope.has(account.id!))
        .map((account) => account.name)
        .join(' + ');
    });

    /**
     * What the plan may actually spend: the Dashboard's own net-worth figure, less the floor the
     * user set. `AccountsStore.netWorth()` is the single source for "how much do I have" — this
     * page never derives a second one.
     */
    const spendableBalance = computed(
      () => startingBalance() - forecastSettingsStore.safetyNetAmount(),
    );

    const affordability = computed(() =>
      computeGoalAffordability(goalsStore.activeGoals(), {
        today: todayIso(),
        startingBalance: startingBalance(),
        safetyNetAmount: forecastSettingsStore.safetyNetAmount(),
        perMonth: velocity().perMonth,
      }),
    );

    /**
     * How far the chart looks: to the last drawable purchase plus a little headroom, so the line
     * after the final goal is visible rather than ending on the step down. With nothing to plot it
     * still draws a year, which is a forecast rather than an empty frame.
     */
    const projectionHorizonMonths = computed(() => {
      const lastMonthsAway = affordability()
        .filter((entry) => entry.monthsAway != null)
        .reduce((max, entry) => Math.max(max, entry.monthsAway as number), 0);
      return Math.max(12, lastMonthsAway + 3);
    });

    /** The month grid alone, with nothing bought — what the purchase dates below are placed on. */
    const baseProjection = computed(() =>
      computeNetWorthProjection({
        today: todayIso(),
        startingBalance: startingBalance(),
        perMonth: velocity().perMonth,
        purchases: [],
        horizonMonths: projectionHorizonMonths(),
      }),
    );

    /**
     * The goals the chart can actually draw a purchase for, and the ones it can't — a goal with no
     * ETA is left off the line rather than parked at the right-hand edge, and counted so the
     * caption can say how many were omitted.
     */
    const plottablePurchases = computed<ProjectedPurchase[]>(() => {
      const goalsById = new Map(goalsStore.activeGoals().map((goal) => [goal.id!, goal]));
      // A goal that is affordable *today* still has to come off the line, or the chart would
      // contradict the rows above it: FUT-05 already charges goal 2's ETA for goal 1's price, so a
      // projection that never subtracts goal 1 draws a balance nobody will ever have. It lands on
      // the first plotted month-end rather than on month 0, which stays the untouched starting
      // balance — "here is what you have, here is what happens once you act on this plan".
      // Index 1 always exists: `projectionHorizonMonths` is never below 12.
      const firstMonthEnd = baseProjection()[1].date;

      // Every id came from `activeGoals()` a line above, so the lookup cannot miss.
      return affordability()
        .filter((entry) => entry.reason !== 'never-at-this-rate')
        .map((entry) => toProjectedPurchase(entry, goalsById.get(entry.goalId)!, firstMonthEnd));
    });

    /** The measured-rate walk — the chart's only line in `when-affordable`, its dashed comparison in the other mode. */
    const measuredProjection = computed(() =>
      computeNetWorthProjection({
        today: todayIso(),
        startingBalance: startingBalance(),
        perMonth: velocity().perMonth,
        purchases: plottablePurchases(),
        horizonMonths: projectionHorizonMonths(),
      }),
    );

    /** FUT-05's question read backwards: fix each goal's date, solve for the rate (TICKET-FUT-09). */
    const requiredPlan = computed(() =>
      computeRequiredSavingRate(goalsStore.activeGoals(), {
        today: todayIso(),
        startingBalance: startingBalance(),
        safetyNetAmount: forecastSettingsStore.safetyNetAmount(),
        perMonth: velocity().perMonth,
      }),
    );

    /**
     * The same walk at the rate the *plan* demands, stepping down on each goal's own wanted-by date
     * — a second caller of `computeNetWorthProjection`, which is why FUT-07 parameterised it.
     */
    const requiredProjection = computed(() => {
      const goalsById = new Map(goalsStore.activeGoals().map((goal) => [goal.id!, goal]));
      const firstMonthEnd = baseProjection()[1].date;
      // Same rule as the other mode: a goal already covered today still has to come off the line,
      // or the picture shows a balance nobody will ever have. Only the ones with no monthly figure
      // to plot — undated, or wanted too soon to save for — are left off, and those are counted.
      const dated = requiredPlan()
        .goals.filter(
          (entry) => entry.reason === 'required' || entry.reason === 'already-affordable',
        )
        .map((entry) => {
          const goal = goalsById.get(entry.goalId)!;
          return {
            goalId: entry.goalId,
            name: goal.name,
            amount: goal.targetAmount,
            on: goal.targetDate && entry.reason === 'required' ? goal.targetDate : firstMonthEnd,
          };
        });

      return computeNetWorthProjection({
        today: todayIso(),
        startingBalance: startingBalance(),
        perMonth: requiredPlan().planRequiredPerMonth ?? velocity().perMonth,
        purchases: dated,
        horizonMonths: projectionHorizonMonths(),
      });
    });

    const isRequiredRateMode = computed(
      () => forecastSettingsStore.activeMode() === 'required-rate',
    );

    return {
      velocity,
      effectiveBasis,
      startingBalance,
      spendableBalance,
      scopeCandidates,
      scopeAccountIds,
      scopeLabel,
      affordability,
      requiredPlan,
      isRequiredRateMode,
      /** The line the chart draws, whichever question the page is answering. */
      projection: computed(() =>
        isRequiredRateMode() ? requiredProjection() : measuredProjection(),
      ),
      /** Only in required-rate mode: what actually happens at the measured rate, for contrast. */
      comparisonProjection: computed(() => (isRequiredRateMode() ? measuredProjection() : null)),
      requiredByGoalId: computed(
        () => new Map(requiredPlan().goals.map((entry) => [entry.goalId, entry])),
      ),
      /**
       * Goals the chart cannot draw, so its caption can account for what isn't there: in
       * `when-affordable` the ones the rate never reaches, in `required-rate` the ones with no date.
       */
      omittedGoalCount: computed(() =>
        isRequiredRateMode()
          ? requiredPlan().goals.filter(
              (entry) => entry.reason === 'no-target-date' || entry.reason === 'due-now',
            ).length
          : affordability().filter((entry) => entry.reason === 'never-at-this-rate').length,
      ),
      affordabilityByGoalId: computed(
        () => new Map(affordability().map((entry) => [entry.goalId, entry])),
      ),
      /** Gates every figure on the page: an opening-balance-only net worth is not a forecast. */
      dataReady: accountsStore.dataReady,
    };
  }),
);
