import { computed, effect, inject, type Signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { computeFullHistoryRange } from '@/core/stats';
import { ALL_TIME_QUICK_RANGE_ID, STAT_QUERY_PARAMS } from '@/shared/utils';
import { AccountsStore } from './accounts.store';
import { RangeStore, type RangePageKey } from './range-state.store';
import { TransactionsStore } from './transactions.store';

const todayIso = (): string => new Date().toISOString().slice(0, 10);

/**
 * Structurally the `mm-range-picker`'s `value` input and its outputs. Declared here rather than
 * imported from `shared/ui` so `core/state` doesn't depend on a presentational component; the
 * shapes are checked against each other at every call site that binds them. `preset` is either a
 * `QUICK_RANGES` id or `'custom'` (TICKET-STAT-37) — a plain `string`, since there's no longer a
 * closed union of ids to type it against. `fromExpr`/`toExpr` are the unresolved `range-expression`
 * text behind `from`/`to` (TICKET-STAT-39) — what the absolute panel's fields seed from, so a
 * relative custom range ("now-30d") reopens as typed text rather than the date it resolved to.
 */
export type PageRangeControl = {
  value: Signal<{ preset: string; from: string; to: string; fromExpr: string; toExpr: string }>;
  onPresetChange: (preset: string) => void;
  onCustomRangeChange: (range: { from: string; to: string }) => void;
  onRangeShift: (direction: -1 | 1) => void;
};

/**
 * Everything a range-owning page needs to render its own `mm-range-picker` (TICKET-UI-23): the
 * bound value, the output handlers, and the URL mirroring that used to live in the app shell.
 *
 * Lives here, not duplicated per page, because `all-time` resolution needs the account/transaction
 * stores (`RangeStore` can't reach them) and the query-param round trip has a skip-if-already-
 * mirrored guard that is easy to get subtly wrong twice. Must be called from an injection context
 * — a component field initializer — same as `balanceTrendSignals`.
 *
 * `page` scopes every read and write, so two pages calling this never touch each other's range.
 * URL mirroring is per page too: the page reads `?from=&to=` on entry (which is what keeps
 * drill-down links working) and mirrors its own range back with `replaceUrl: true`. A page that
 * never calls this neither reads nor writes those params.
 */
export const pageRangeControl = (page: RangePageKey): PageRangeControl => {
  const rangeStore = inject(RangeStore);
  const accountsStore = inject(AccountsStore);
  const transactionsStore = inject(TransactionsStore);
  const route = inject(ActivatedRoute);
  const router = inject(Router);

  const initialParams = route.snapshot.queryParamMap;
  const initialFrom = initialParams.get(STAT_QUERY_PARAMS.from);
  const initialTo = initialParams.get(STAT_QUERY_PARAMS.to);
  // Adopt the URL's range only when it actually differs from what this page already holds — the
  // mirror below writes the page's own range into these same params, so an unguarded read would
  // demote a named preset to "Custom" every time the user came back to the page (refresh, back
  // navigation, bookmark). The guard is the entry-side twin of `alreadyMirrored` further down.
  // Compared against the unresolved expression (TICKET-STAT-36), not the resolved date — a
  // relative range's mirrored `now-30d` would otherwise never equal its own resolved boundary.
  const differsFromCurrent =
    initialFrom !== rangeStore.fromExpr(page) || initialTo !== rangeStore.toExpr(page);
  if (initialFrom && initialTo && differsFromCurrent) {
    rangeStore.setCustomRange(page, initialFrom, initialTo);
  }

  effect(() => {
    // Mirrors the unresolved expression (TICKET-STAT-36), so a relative range round-trips as
    // `now-30d` rather than freezing into the date it happened to resolve to at write time.
    const queryParams = {
      [STAT_QUERY_PARAMS.from]: rangeStore.fromExpr(page),
      [STAT_QUERY_PARAMS.to]: rangeStore.toExpr(page),
    };

    // Skip navigating when the URL already mirrors this state — otherwise the initial read-in
    // triggers an immediate redundant navigation right after construction.
    const currentParams = route.snapshot.queryParamMap;
    const alreadyMirrored = Object.entries(queryParams).every(
      ([key, value]) => currentParams.get(key) === value,
    );
    if (alreadyMirrored) {
      return;
    }

    void router.navigate([], { queryParams, queryParamsHandling: 'merge', replaceUrl: true });
  });

  return {
    value: computed(() => ({
      preset: rangeStore.preset(page),
      from: rangeStore.from(page),
      to: rangeStore.to(page),
      fromExpr: rangeStore.fromExpr(page),
      toExpr: rangeStore.toExpr(page),
    })),

    onPresetChange: (preset: string): void => {
      if (preset === 'custom') {
        rangeStore.selectCustomPreset(page);
        return;
      }
      if (preset === ALL_TIME_QUICK_RANGE_ID) {
        rangeStore.setPreset(
          page,
          preset,
          computeFullHistoryRange(
            accountsStore.activeAccounts(),
            transactionsStore.transactions(),
            todayIso(),
          ),
        );
        return;
      }
      rangeStore.setPreset(page, preset);
    },

    onCustomRangeChange: ({ from, to }: { from: string; to: string }): void => {
      rangeStore.setCustomRange(page, from, to);
    },

    onRangeShift: (direction: -1 | 1): void => {
      rangeStore.shiftRange(page, direction);
    },
  };
};
