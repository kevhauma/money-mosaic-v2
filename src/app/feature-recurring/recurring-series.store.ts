import { computed, inject } from '@angular/core';
import {
  patchState,
  signalStore,
  withComputed,
  withHooks,
  withMethods,
  withState,
} from '@ngrx/signals';
import { detectRecurringPayments, type RecurringPaymentSeries } from '@/core/stats';
import { savingsAccountIbans } from '@/core/transfers';
import { RecurringOverridesRepository, type RecurringOverride } from '@/core/data-access';
import { AccountsStore, CategoriesStore, TransactionsStore } from '@/core/state';
import { anchorOf, applyRecurringOverrides, mergeCandidatePairs } from './recurring-overrides';

const todayIso = (): string => new Date().toISOString().slice(0, 10);

type OverridesState = {
  overrides: RecurringOverride[];
  /** The repository read has landed. An empty list and a not-yet-loaded one look identical. */
  hydrated: boolean;
};

const INITIAL: OverridesState = { overrides: [], hydrated: false };

/**
 * The recurring series every section of the Recurring track reads (FR-REC-1) — detection over the
 * **whole** transaction history, derived once and shared, rather than recomputed by each panel that
 * happens to want it.
 *
 * It exists because the recurring payments panel (TICKET-REC-02) and the bills calendar
 * (TICKET-REC-03) need the identical detection with the identical arguments. Both sections lived on
 * `/explore` when this was written, and it is what that page's "no store, on purpose" note reserved
 * a store for — state (here, a derivation) genuinely shared *between* a page's sections.
 *
 * Detection itself stays a pure `computed()` derivation, the `StatsStore` shape: importing a
 * transaction updates `TransactionsStore` and flows straight through with no invalidation.
 * Snapshotting `today` here also settles it for every consumer at once, so two sections can never
 * disagree about where the history ends.
 *
 * What it *does* hold is the user's corrections (TICKET-REC-11) — dismissals and merges, persisted
 * through `RecurringOverridesRepository` and re-applied on top of every fresh detection run. That
 * is the only state here, and it is the point: detection may recompute freely, and may not
 * overwrite what the user said about it.
 *
 * Lives in `feature-recurring` rather than `core/state` because only this feature consumes it; move
 * it if a Dashboard card ever wants the same series.
 */
export const RecurringSeriesStore = signalStore(
  { providedIn: 'root' },
  withState(INITIAL),
  withComputed(({ overrides, hydrated }) => {
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

    /**
     * Detection with the user's corrections folded in — every consumer reads this, never `detected`,
     * so a dismissed payment cannot reappear in one section of the page and not another.
     *
     * While the overrides are still loading it reports **no** series rather than the uncorrected
     * ones: a dismissed payment flashing back onto the page for a moment on every visit is exactly
     * the "the app forgot what I told it" the ticket exists to remove.
     */
    const applied = computed(() =>
      hydrated()
        ? applyRecurringOverrides(detected().series, overrides())
        : {
            series: [] as RecurringPaymentSeries[],
            dismissed: [],
            mergeOverrideIdByKey: new Map<string, number>(),
          },
    );

    const series = computed(() => applied().series);

    return {
      series,
      /** Series the user dismissed, kept so the page can offer them back (TICKET-REC-11). */
      dismissedSeries: computed(() => applied().dismissed),
      /** Which rows carry a user merge, and the override that would undo it (TICKET-REC-11). */
      mergeOverrideIdByKey: computed(() => applied().mergeOverrideIdByKey),
      /** Rows that look like the same payment listed twice, offered for merging (TICKET-REC-11). */
      mergeCandidates: computed(() => mergeCandidatePairs(series())),
      /** Whether the corrections have loaded — until then the page has nothing true to show. */
      overridesLoaded: hydrated,
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
  withMethods((store) => {
    const repository = inject(RecurringOverridesRepository);
    let hydration: Promise<void> | null = null;

    const record = async (override: RecurringOverride): Promise<void> => {
      const id = await repository.add(override);
      patchState(store, { overrides: [...store.overrides(), { ...override, id }] });
    };

    return {
      /** Idempotent — triggered on first injection (`withHooks` below, TICKET-PERF-07). */
      hydrate: (): Promise<void> => {
        if (!hydration) {
          hydration = repository.getAll().then((overrides) => {
            patchState(store, { overrides, hydrated: true });
          });
        }
        return hydration;
      },

      /** "This isn't really a recurring payment." Survives re-detection; reversible via `restore`. */
      dismissSeries: (series: RecurringPaymentSeries): Promise<void> =>
        record({
          kind: 'dismissed',
          anchorTransactionId: anchorOf(series),
          createdAt: new Date().toISOString(),
        }),

      /** "These two rows are the same payment." `duplicate` is folded into `primary`. */
      mergeSeries: (
        primary: RecurringPaymentSeries,
        duplicate: RecurringPaymentSeries,
      ): Promise<void> =>
        record({
          kind: 'merged',
          anchorTransactionId: anchorOf(duplicate),
          mergedIntoTransactionId: anchorOf(primary),
          createdAt: new Date().toISOString(),
        }),

      /** Undoes one correction — the half that makes dismissal itself reversible automation. */
      restoreOverride: async (overrideId: number): Promise<void> => {
        await repository.remove(overrideId);
        patchState(store, {
          overrides: store.overrides().filter((override) => override.id !== overrideId),
        });
      },
    };
  }),
  withHooks({
    onInit(store) {
      // Fire-and-forget on first injection rather than at app bootstrap (TICKET-PERF-07).
      void store.hydrate();
    },
  }),
);
