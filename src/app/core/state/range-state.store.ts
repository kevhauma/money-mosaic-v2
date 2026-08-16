import { patchState, signalStore, withMethods, withState } from '@ngrx/signals';
import {
  alignedCalendarUnit,
  parseRangeExpression,
  resolvePresetRange,
  resolveRangeExpression,
  shiftRangeByCalendarUnit,
  shiftRangeByDayCount,
  type CalendarUnit,
  type RangePreset,
} from '@/shared/utils';

/**
 * The pages that own a date range (TICKET-UI-23). Adding one here is the whole cost of giving a
 * new page its own range; a page that isn't listed has no range control and never reads one.
 */
export type RangePageKey = 'dashboard' | 'accounts' | 'explore';

const RANGE_PAGE_KEYS: readonly RangePageKey[] = ['dashboard', 'accounts', 'explore'];

/**
 * `quickRangeId` is a plain id rather than the `RangePreset` union (TICKET-STAT-36) — until the
 * STAT-37 catalogue lands, it's always either `null` (a hand-built range) or a `RangePreset`
 * string written by `setPreset`. `fromExpr`/`toExpr` are canonical `range-expression` text
 * (STAT-35): an ISO date for an absolute range, or `now±NX(/X)?` for a relative one. They're only
 * read back when `quickRangeId` is `null` or `'all-time'` — a named preset re-resolves through
 * `resolvePresetRange` instead, which is what makes a stale-dated store self-correct on read.
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

type RangeEdge = 'from' | 'to';

/** The raw expression text for `edge`, ignoring any live preset resolution — what the URL mirror writes. */
const rawExpr = (state: RangeState, edge: RangeEdge): string =>
  edge === 'from' ? state.fromExpr : state.toExpr;

/**
 * A named preset (anything but `null`/`'all-time'`) always re-resolves fresh against `today`
 * rather than trusting the expressions last written for it — that's the fix for a store seeded
 * days ago still reporting the old boundaries. Returns `null` for `'all-time'`/hand-built states,
 * whose boundary comes from the stored expression instead (see `resolveBoundary`/`resolveRawBoundary`).
 */
const resolvedPresetBoundary = (
  state: RangeState,
  today: string,
  edge: RangeEdge,
): string | null =>
  state.quickRangeId && state.quickRangeId !== 'all-time'
    ? resolvePresetRange(state.quickRangeId as Exclude<RangePreset, 'all-time'>, today)[edge]
    : null;

/**
 * `all-time`/hand-built states resolve their stored expression: an absolute date for `all-time`
 * (its `from` depends on account data, not today) and possibly a relative expression like
 * `now-30d` for a hand-built range.
 */
const resolveBoundary = (state: RangeState, today: string, edge: RangeEdge): string => {
  const presetBoundary = resolvedPresetBoundary(state, today, edge);
  if (presetBoundary !== null) {
    return presetBoundary;
  }
  const text = rawExpr(state, edge);
  const parsed = parseRangeExpression(text);
  return parsed.ok ? resolveRangeExpression(parsed.value, today, edge) : text;
};

/** Same resolution rule as `resolveBoundary`, but returns the unresolved expression text for a hand-built range instead of a resolved date — what the URL mirror needs so a relative range round-trips as text. */
const resolveRawBoundary = (state: RangeState, today: string, edge: RangeEdge): string =>
  resolvedPresetBoundary(state, today, edge) ?? rawExpr(state, edge);

/** Calendar-aligned presets shift by their matching whole unit; every other preset (rolling-window or custom) shifts by its own day-count instead (TICKET-STAT-16). */
const CALENDAR_UNIT_BY_PRESET: Partial<Record<RangePreset, CalendarUnit>> = {
  'this-week': 'week',
  'this-month': 'month',
  'last-month': 'month',
  'this-quarter': 'quarter',
  'last-quarter': 'quarter',
  'this-year': 'year',
  'last-year': 'year',
};

const defaultRangeState = (): RangeState => {
  const range = resolvePresetRange('this-month', todayIso());
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
    const stateFor = (page: RangePageKey): RangeState => store.byPage()[page];

    const patchPage = (page: RangePageKey, next: Partial<RangeState>): void => {
      patchState(store, ({ byPage }) => ({
        byPage: { ...byPage, [page]: { ...byPage[page], ...next } },
      }));
    };

    return {
      // `quickRangeId` doubles as today's `RangePreset | 'custom'` until STAT-37 retires the
      // union: `null` only ever means a hand-built range (today's `'custom'`).
      preset: (page: RangePageKey): RangePreset | 'custom' =>
        (stateFor(page).quickRangeId ?? 'custom') as RangePreset | 'custom',
      from: (page: RangePageKey): string => resolveBoundary(stateFor(page), todayIso(), 'from'),
      to: (page: RangePageKey): string => resolveBoundary(stateFor(page), todayIso(), 'to'),

      /**
       * The unresolved expression backing `from(page)`/`to(page)` — an ISO date for an absolute
       * range, `now-30d`-style text for a relative one. Nothing outside `core/state` should read
       * these; they exist for `pageRangeControl`'s URL mirror, which needs to write the
       * expression back so a bookmarked relative range survives a reload as relative, not the
       * date it happened to resolve to on save.
       */
      fromExpr: (page: RangePageKey): string =>
        resolveRawBoundary(stateFor(page), todayIso(), 'from'),
      toExpr: (page: RangePageKey): string => resolveRawBoundary(stateFor(page), todayIso(), 'to'),

      /**
       * `all-time` depends on account/transaction data rather than just today's date, so its range
       * can't be resolved purely here — the caller (which has access to those stores) computes it
       * via `computeFullHistoryRange` and passes it in.
       */
      setPreset: (
        page: RangePageKey,
        preset: RangePreset,
        allTimeRange?: { from: string; to: string },
      ): void => {
        const range =
          preset === 'all-time'
            ? (allTimeRange ?? { from: todayIso(), to: todayIso() })
            : resolvePresetRange(preset, todayIso());
        patchPage(page, { quickRangeId: preset, fromExpr: range.from, toExpr: range.to });
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
       * backward in time, `1` (next) shifts forward. `year-to-date`/`all-time` have no fixed,
       * repeatable length so they're a no-op here (the switcher also disables the buttons in that
       * state). Every shift resolves the current boundaries fresh, then clears `quickRangeId`
       * (TICKET-STAT-36) — STAT-16's existing flip-to-Custom rule, since a shifted range generally
       * no longer matches the named preset's semantics — and writes the shifted result back as
       * absolute expressions.
       *
       * Once `quickRangeId` is already `null` (i.e. this isn't the first shift), the named preset
       * is gone, so whether to keep shifting by whole calendar units is decided from the *actual*
       * from/to boundaries instead (`alignedCalendarUnit`) — otherwise a chain of "previous" clicks
       * on a year/month/quarter range would silently degrade to a fixed day-count shift after the
       * first click and drift off the real boundaries (e.g. across a leap year).
       */
      shiftRange: (page: RangePageKey, direction: -1 | 1): void => {
        const state = stateFor(page);
        if (state.quickRangeId === 'year-to-date' || state.quickRangeId === 'all-time') {
          return;
        }

        const today = todayIso();
        const from = resolveBoundary(state, today, 'from');
        const to = resolveBoundary(state, today, 'to');
        const unit = state.quickRangeId
          ? CALENDAR_UNIT_BY_PRESET[state.quickRangeId as RangePreset]
          : alignedCalendarUnit(from, to);
        const range = unit
          ? shiftRangeByCalendarUnit(from, to, unit, -direction)
          : shiftRangeByDayCount(from, to, -direction);

        patchPage(page, { quickRangeId: null, fromExpr: range.from, toExpr: range.to });
      },
    };
  }),
);
