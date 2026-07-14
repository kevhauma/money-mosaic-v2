import { patchState, signalStore, withMethods, withState } from '@ngrx/signals';
import {
  alignedCalendarUnit,
  resolvePresetRange,
  shiftRangeByCalendarUnit,
  shiftRangeByDayCount,
  type CalendarUnit,
  type RangePreset,
} from './date-buckets';

type RangeState = {
  preset: RangePreset | 'custom';
  from: string;
  to: string;
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

/**
 * Global date-range state (FR-STAT-7), the single source of truth read by the topbar switcher and
 * every range-scoped Dashboard/Accounts stat. Ephemeral UI state only — not Dexie-backed, resets
 * to the current-month default on reload. Bucket granularity is chart-local state, not part of
 * this store (TICKET-STAT-15) — each trend chart owns its own default via `pickGranularityForSpan`.
 */
export const RangeStore = signalStore(
  { providedIn: 'root' },
  withState<RangeState>(defaultRangeState()),
  withMethods((store) => ({
    /**
     * `all-time` depends on account/transaction data rather than just today's date, so its range
     * can't be resolved purely here — the caller (which has access to those stores) computes it
     * via `computeFullHistoryRange` and passes it in.
     */
    setPreset: (preset: RangePreset, allTimeRange?: { from: string; to: string }): void => {
      const range =
        preset === 'all-time'
          ? (allTimeRange ?? { from: todayIso(), to: todayIso() })
          : resolvePresetRange(preset, todayIso());
      patchState(store, { preset, ...range });
    },

    setCustomRange: (from: string, to: string): void => {
      patchState(store, { preset: 'custom', from, to });
    },

    /**
     * Selecting "Custom" only flips the preset flag — it deliberately leaves from/to
     * untouched so the previously-active range stays as the starting point for the now-enabled
     * date pickers (TICKET-STAT-03, folds in the TICKET-STAT-01 enable-inputs bug fix).
     */
    selectCustomPreset: (): void => {
      patchState(store, { preset: 'custom' });
    },

    /**
     * Steps the active range back/forward by its own length: `-1` (previous) shifts backward in
     * time, `1` (next) shifts forward. `year-to-date`/`all-time` have no fixed, repeatable length
     * so they're a no-op here (the topbar also disables the buttons in that state). Every shift
     * flips `preset` to `'custom'`, since a shifted range generally no longer matches the named
     * preset's semantics.
     *
     * Once `preset` is already `'custom'` (i.e. this isn't the first shift), the named preset is
     * gone, so whether to keep shifting by whole calendar units is decided from the *actual*
     * from/to boundaries instead (`alignedCalendarUnit`) — otherwise a chain of "previous" clicks
     * on a year/month/quarter range would silently degrade to a fixed day-count shift after the
     * first click and drift off the real boundaries (e.g. across a leap year).
     */
    shiftRange: (direction: -1 | 1): void => {
      const { preset, from, to } = store;
      const currentPreset = preset();
      if (currentPreset === 'year-to-date' || currentPreset === 'all-time') {
        return;
      }

      const unit =
        currentPreset === 'custom'
          ? alignedCalendarUnit(from(), to())
          : CALENDAR_UNIT_BY_PRESET[currentPreset];
      const range = unit
        ? shiftRangeByCalendarUnit(from(), to(), unit, -direction)
        : shiftRangeByDayCount(from(), to(), -direction);

      patchState(store, { preset: 'custom', ...range });
    },
  })),
);
