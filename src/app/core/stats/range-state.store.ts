import { patchState, signalStore, withMethods, withState } from '@ngrx/signals';
import { resolvePresetRange, type RangePreset } from './date-buckets';

type RangeState = {
  preset: RangePreset | 'custom';
  from: string;
  to: string;
};

const todayIso = (): string => new Date().toISOString().slice(0, 10);

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
  })),
);
