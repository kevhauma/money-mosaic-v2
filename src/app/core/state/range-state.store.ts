import { inject } from '@angular/core';
import { patchState, signalStore, withMethods, withState } from '@ngrx/signals';
import {
  ALL_TIME_QUICK_RANGE_ID,
  alignedCalendarUnit,
  parseRangeExpression,
  quickRangeById,
  resolveQuickRange,
  resolveRangeExpression,
  shiftRangeByCalendarUnit,
  shiftRangeByDayCount,
} from '@/shared/utils';
import { AppSettingsStore } from './app-settings.store';

/**
 * The pages that own a date range (TICKET-UI-23). Adding one here is the whole cost of giving a
 * new page its own range; a page that isn't listed has no range control and never reads one.
 */
export type RangePageKey = 'dashboard' | 'accounts' | 'explore';

const RANGE_PAGE_KEYS: readonly RangePageKey[] = ['dashboard', 'accounts', 'explore'];

/**
 * `quickRangeId` is a plain id into `quick-ranges.ts`'s `QUICK_RANGES` catalogue (TICKET-STAT-37),
 * or `null` for a hand-built range (today's `'custom'`). `fromExpr`/`toExpr` are canonical
 * `range-expression` text (STAT-35): an ISO date for an absolute range, or `now±NX(/X)?` for a
 * relative one. They're only read back when `quickRangeId` is `null` or names the `all-time` entry
 * — every other quick range re-resolves through the catalogue instead, which is what makes a
 * stale-dated store self-correct on read.
 */
type RangeState = {
  quickRangeId: string | null;
  fromExpr: string;
  toExpr: string;
};

type RangeStoreState = {
  byPage: Record<RangePageKey, RangeState>;
};

const todayIso = (): string => new Date().toISOString().slice(0, 10);

/** `fiscalYearStartMonth` unset means January — today's exact calendar behaviour (TICKET-SET-09). */
const DEFAULT_FISCAL_YEAR_START_MONTH = 1;

type RangeEdge = 'from' | 'to';

/** The raw expression text for `edge`, ignoring any live catalogue resolution — what the URL mirror writes. */
const rawExpr = (state: RangeState, edge: RangeEdge): string =>
  edge === 'from' ? state.fromExpr : state.toExpr;

/**
 * A catalogue quick range (anything but `null`/`all-time`) always re-resolves fresh against
 * `today`/the fiscal setting rather than trusting the expressions last written for it — that's the
 * fix for a store seeded days ago still reporting the old boundaries. Returns `null` for
 * `all-time`/hand-built states and for an id the catalogue no longer recognises, whose boundary
 * comes from the stored expression instead (see `resolveBoundary`/`resolveRawBoundary`).
 */
const resolvedCatalogueBoundary = (
  state: RangeState,
  today: string,
  fiscalYearStartMonth: number,
  edge: RangeEdge,
): string | null => {
  const entry = state.quickRangeId ? quickRangeById(state.quickRangeId) : undefined;
  if (!entry || 'external' in entry) {
    return null;
  }
  return resolveQuickRange(entry, today, fiscalYearStartMonth)[edge];
};

/**
 * `all-time`/hand-built states resolve their stored expression: an absolute date for `all-time`
 * (its `from` depends on account data, not today) and possibly a relative expression like
 * `now-30d` for a hand-built range.
 */
const resolveBoundary = (
  state: RangeState,
  today: string,
  fiscalYearStartMonth: number,
  edge: RangeEdge,
): string => {
  const catalogueBoundary = resolvedCatalogueBoundary(state, today, fiscalYearStartMonth, edge);
  if (catalogueBoundary !== null) {
    return catalogueBoundary;
  }
  const text = rawExpr(state, edge);
  const parsed = parseRangeExpression(text);
  return parsed.ok ? resolveRangeExpression(parsed.value, today, edge) : text;
};

/** Same resolution rule as `resolveBoundary`, but returns the unresolved expression text for a hand-built range instead of a resolved date — what the URL mirror needs so a relative range round-trips as text. */
const resolveRawBoundary = (
  state: RangeState,
  today: string,
  fiscalYearStartMonth: number,
  edge: RangeEdge,
): string =>
  resolvedCatalogueBoundary(state, today, fiscalYearStartMonth, edge) ?? rawExpr(state, edge);

const defaultRangeState = (): RangeState => {
  const entry = quickRangeById('this-month');
  if (!entry || 'external' in entry) {
    throw new Error('"this-month" must be a resolvable quick range');
  }
  // 'this-month' is always a plain expression entry — never fiscal — so the fiscal param below
  // is unused; DEFAULT_FISCAL_YEAR_START_MONTH is passed only because `resolveQuickRange` always
  // takes one.
  const range = resolveQuickRange(entry, todayIso(), DEFAULT_FISCAL_YEAR_START_MONTH);
  return { quickRangeId: 'this-month', fromExpr: range.from, toExpr: range.to };
};

const defaultStoreState = (): RangeStoreState => ({
  byPage: Object.fromEntries(RANGE_PAGE_KEYS.map((page) => [page, defaultRangeState()])) as Record<
    RangePageKey,
    RangeState
  >,
});

/**
 * Date-range state (FR-STAT-7), held **per range-owning page** (TICKET-UI-23): narrowing the
 * Dashboard to last month no longer re-scopes the Accounts chart someone set up five minutes ago.
 * Every accessor and mutator takes the page it acts on, and each page defaults to `this-month`
 * exactly as the single shared range did.
 *
 * Keyed root store rather than a route-level provider — the choice TICKET-UI-23 asked us to record.
 * `StatsStore` is `providedIn: 'root'` and injects this store, and a root-provided store cannot see
 * a route-level provider, so one instance per lazy route would mean making `StatsStore` (and every
 * root consumer after it) route-scoped too. A `Record<pageKey, …>` keeps the injector graph as-is
 * and makes the isolation testable in one place.
 *
 * Ephemeral UI state only — not Dexie-backed, resets to the current-month default on reload. Bucket
 * granularity is not part of this store: it is per-chart, seeded from a page's range on first mount
 * via `pickGranularityForSpan` (TICKET-STAT-15) and then held for the session by `ChartOptionsStore`
 * (TICKET-STAT-27), alongside each chart's hidden series and dragged zoom window.
 */
export const RangeStore = signalStore(
  { providedIn: 'root' },
  withState<RangeStoreState>(defaultStoreState()),
  withMethods((store) => {
    const appSettingsStore = inject(AppSettingsStore);
    const stateFor = (page: RangePageKey): RangeState => store.byPage()[page];
    const fiscalYearStartMonth = (): number =>
      appSettingsStore.fiscalYearStartMonth() ?? DEFAULT_FISCAL_YEAR_START_MONTH;

    const patchPage = (page: RangePageKey, next: Partial<RangeState>): void => {
      patchState(store, ({ byPage }) => ({
        byPage: { ...byPage, [page]: { ...byPage[page], ...next } },
      }));
    };

    return {
      // `quickRangeId` doubles as today's preset id: `null` only ever means a hand-built range
      // (today's `'custom'`).
      preset: (page: RangePageKey): string => stateFor(page).quickRangeId ?? 'custom',
      from: (page: RangePageKey): string =>
        resolveBoundary(stateFor(page), todayIso(), fiscalYearStartMonth(), 'from'),
      to: (page: RangePageKey): string =>
        resolveBoundary(stateFor(page), todayIso(), fiscalYearStartMonth(), 'to'),

      /**
       * The unresolved expression backing `from(page)`/`to(page)` — an ISO date for an absolute
       * range, `now-30d`-style text for a relative one. Nothing outside `core/state` should read
       * these; they exist for `pageRangeControl`'s URL mirror, which needs to write the
       * expression back so a bookmarked relative range survives a reload as relative, not the
       * date it happened to resolve to on save.
       */
      fromExpr: (page: RangePageKey): string =>
        resolveRawBoundary(stateFor(page), todayIso(), fiscalYearStartMonth(), 'from'),
      toExpr: (page: RangePageKey): string =>
        resolveRawBoundary(stateFor(page), todayIso(), fiscalYearStartMonth(), 'to'),

      /**
       * `all-time` depends on account/transaction data rather than just today's date, so its range
       * can't be resolved purely here — the caller (which has access to those stores) computes it
       * via `computeFullHistoryRange` and passes it in.
       */
      setPreset: (
        page: RangePageKey,
        id: string,
        allTimeRange?: { from: string; to: string },
      ): void => {
        if (id === ALL_TIME_QUICK_RANGE_ID) {
          const range = allTimeRange ?? { from: todayIso(), to: todayIso() };
          patchPage(page, { quickRangeId: id, fromExpr: range.from, toExpr: range.to });
          return;
        }

        const entry = quickRangeById(id);
        const range =
          entry && !('external' in entry)
            ? resolveQuickRange(entry, todayIso(), fiscalYearStartMonth())
            : { from: todayIso(), to: todayIso() };
        patchPage(page, { quickRangeId: id, fromExpr: range.from, toExpr: range.to });
      },

      /**
       * `from`/`to` are canonical `range-expression` text (STAT-35) — an ISO date or a relative
       * expression like `now-30d`. Both come through here unresolved: the absolute date pickers
       * pass an ISO date, and a URL carrying `?from=now-30d` passes that text straight through, so
       * the range stays relative rather than freezing into whatever it resolved to at save time.
       */
      setCustomRange: (page: RangePageKey, from: string, to: string): void => {
        patchPage(page, { quickRangeId: null, fromExpr: from, toExpr: to });
      },

      /**
       * Selecting "Custom" only flips the preset flag — it deliberately leaves from/to
       * untouched so the previously-active range stays as the starting point for the now-enabled
       * date pickers (TICKET-STAT-03, folds in the TICKET-STAT-01 enable-inputs bug fix).
       */
      selectCustomPreset: (page: RangePageKey): void => {
        patchPage(page, { quickRangeId: null });
      },

      /**
       * Steps that page's active range back/forward by its own length: `-1` (previous) shifts
       * backward in time, `1` (next) shifts forward. Entries with no fixed, repeatable length
       * ("so far" variants, `all-time`) are a no-op here — `QuickRangeEntry.steppingDisabled`
       * (TICKET-STAT-37; the switcher also disables the buttons in that state). Every shift
       * resolves the current boundaries fresh, then clears `quickRangeId` (TICKET-STAT-36) —
       * STAT-16's existing flip-to-Custom rule, since a shifted range generally no longer matches
       * the named preset's semantics — and writes the shifted result back as absolute expressions.
       *
       * Once `quickRangeId` is already `null` (i.e. this isn't the first shift), the named preset
       * is gone, so whether to keep shifting by whole calendar units is decided from the *actual*
       * from/to boundaries instead (`alignedCalendarUnit`) — otherwise a chain of "previous" clicks
       * on a year/month/quarter range would silently degrade to a fixed day-count shift after the
       * first click and drift off the real boundaries (e.g. across a leap year).
       */
      shiftRange: (page: RangePageKey, direction: -1 | 1): void => {
        const state = stateFor(page);
        const entry = state.quickRangeId ? quickRangeById(state.quickRangeId) : undefined;
        if (entry?.steppingDisabled) {
          return;
        }

        const today = todayIso();
        const fiscalMonth = fiscalYearStartMonth();
        const from = resolveBoundary(state, today, fiscalMonth, 'from');
        const to = resolveBoundary(state, today, fiscalMonth, 'to');
        const unit = entry?.calendarUnit ?? alignedCalendarUnit(from, to);
        const range = unit
          ? shiftRangeByCalendarUnit(from, to, unit, -direction)
          : shiftRangeByDayCount(from, to, -direction);

        patchPage(page, { quickRangeId: null, fromExpr: range.from, toExpr: range.to });
      },
    };
  }),
);
