import { patchState, signalStore, withMethods, withState } from '@ngrx/signals';
import {
  defaultGranularityForPreset,
  resolvePresetRange,
  type Granularity,
  type RangePreset,
} from './date-buckets';
import { pickGranularityForSpan } from './granularity-for-span';

type RangeState = {
  preset: RangePreset | 'custom';
  from: string;
  to: string;
  groupBy: Granularity;
};

const todayIso = (): string => new Date().toISOString().slice(0, 10);

const defaultRangeState = (): RangeState => ({
  preset: 'this-month',
  ...resolvePresetRange('this-month', todayIso()),
  groupBy: 'month',
});

/**
 * Global date-range + grouping-granularity state (FR-STAT-7), the single source of truth read
 * by the topbar switcher and the Dashboard, and mirrored to/from the `from`/`to`/`groupBy` query
 * params by the root `App` component (kept out of this store so it stays router-agnostic).
 * Ephemeral UI state only — not Dexie-backed, resets to the current-month/month default on reload.
 */
export const RangeStore = signalStore(
  { providedIn: 'root' },
  withState<RangeState>(defaultRangeState()),
  withMethods((store) => ({
    /**
     * Applies a preset's range and its default grouping in one patch (TICKET-STAT-03). `all-time`
     * depends on account/transaction data rather than just today's date, so its range can't be
     * resolved purely here — the caller (which has access to those stores) computes it via
     * `computeFullHistoryRange` and passes it in.
     */
    setPreset: (preset: RangePreset, allTimeRange?: { from: string; to: string }): void => {
      const range =
        preset === 'all-time'
          ? (allTimeRange ?? { from: todayIso(), to: todayIso() })
          : resolvePresetRange(preset, todayIso());
      patchState(store, { preset, ...range, groupBy: defaultGranularityForPreset(preset) });
    },

    setCustomRange: (from: string, to: string): void => {
      patchState(store, { preset: 'custom', from, to, groupBy: pickGranularityForSpan(from, to) });
    },

    /**
     * Selecting "Custom" only flips the preset flag — it deliberately leaves from/to/groupBy
     * untouched so the previously-active range stays as the starting point for the now-enabled
     * date pickers (TICKET-STAT-03, folds in the TICKET-STAT-01 enable-inputs bug fix).
     */
    selectCustomPreset: (): void => {
      patchState(store, { preset: 'custom' });
    },

    setGroupBy: (groupBy: Granularity): void => {
      patchState(store, { groupBy });
    },
  })),
);
