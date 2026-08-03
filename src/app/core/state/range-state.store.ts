import { patchState, signalStore, withMethods, withState } from '@ngrx/signals';
import {
  alignedCalendarUnit,
  resolvePresetRange,
  shiftRangeByCalendarUnit,
  shiftRangeByDayCount,
  type CalendarUnit,
  type RangePreset,
} from '@/shared/utils';

/**
 * The pages that own a date range (TICKET-UI-23). Adding one here is the whole cost of giving a
 * new page its own range; a page that isn't listed has no range control and never reads one.
 */
export type RangePageKey = 'dashboard' | 'accounts';

const RANGE_PAGE_KEYS: readonly RangePageKey[] = ['dashboard', 'accounts'];

type RangeState = {
  preset: RangePreset | 'custom';
  from: string;
  to: string;
};

type RangeStoreState = {
  byPage: Record<RangePageKey, RangeState>;
};

const todayIso = (): string => new Date().toISOString().slice(0, 10);

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

const defaultRangeState = (): RangeState => ({
  preset: 'this-month',
  ...resolvePresetRange('this-month', todayIso()),
});

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
      preset: (page: RangePageKey): RangePreset | 'custom' => stateFor(page).preset,
      from: (page: RangePageKey): string => stateFor(page).from,
      to: (page: RangePageKey): string => stateFor(page).to,

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
        patchPage(page, { preset, ...range });
      },

      setCustomRange: (page: RangePageKey, from: string, to: string): void => {
        patchPage(page, { preset: 'custom', from, to });
      },

      /**
       * Selecting "Custom" only flips the preset flag — it deliberately leaves from/to
       * untouched so the previously-active range stays as the starting point for the now-enabled
       * date pickers (TICKET-STAT-03, folds in the TICKET-STAT-01 enable-inputs bug fix).
       */
      selectCustomPreset: (page: RangePageKey): void => {
        patchPage(page, { preset: 'custom' });
      },

      /**
       * Steps that page's active range back/forward by its own length: `-1` (previous) shifts
       * backward in time, `1` (next) shifts forward. `year-to-date`/`all-time` have no fixed,
       * repeatable length so they're a no-op here (the switcher also disables the buttons in that
       * state). Every shift flips `preset` to `'custom'`, since a shifted range generally no longer
       * matches the named preset's semantics.
       *
       * Once `preset` is already `'custom'` (i.e. this isn't the first shift), the named preset is
       * gone, so whether to keep shifting by whole calendar units is decided from the *actual*
       * from/to boundaries instead (`alignedCalendarUnit`) — otherwise a chain of "previous" clicks
       * on a year/month/quarter range would silently degrade to a fixed day-count shift after the
       * first click and drift off the real boundaries (e.g. across a leap year).
       */
      shiftRange: (page: RangePageKey, direction: -1 | 1): void => {
        const { preset, from, to } = stateFor(page);
        if (preset === 'year-to-date' || preset === 'all-time') {
          return;
        }

        const unit =
          preset === 'custom' ? alignedCalendarUnit(from, to) : CALENDAR_UNIT_BY_PRESET[preset];
        const range = unit
          ? shiftRangeByCalendarUnit(from, to, unit, -direction)
          : shiftRangeByDayCount(from, to, -direction);

        patchPage(page, { preset: 'custom', ...range });
      },
    };
  }),
);
