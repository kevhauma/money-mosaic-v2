import { patchState, signalStore, withMethods, withState } from '@ngrx/signals';
import { resolvePresetRange, type Granularity, type RangePreset } from './date-buckets';

export type RangeState = {
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
    setPreset: (preset: RangePreset): void => {
      patchState(store, { preset, ...resolvePresetRange(preset, todayIso()) });
    },

    setCustomRange: (from: string, to: string): void => {
      patchState(store, { preset: 'custom', from, to });
    },

    setGroupBy: (groupBy: Granularity): void => {
      patchState(store, { groupBy });
    },
  })),
);
