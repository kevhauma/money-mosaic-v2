import { computed, effect, inject, untracked, type Signal } from '@angular/core';
import type { ChartZoomByPercent } from '@/shared/echarts';
import type { CycleKey, Granularity } from '@/shared/utils';
import { ChartOptionsStore, type ChartOptionsKey } from './chart-options.store';

export type ChartGranularityControl = {
  value: Signal<Granularity>;
  set: (granularity: Granularity) => void;
};

/**
 * A bucket-size control that outlives its component (TICKET-STAT-27). Reads whatever the session
 * holds for `chart` and falls back to `seed()` — normally `pickGranularityForSpan(...)` — so
 * navigating away from a page and back keeps the bucket the user picked instead of re-deriving it
 * from the range.
 *
 * The store stays the single source of truth, same shape as `pageRangeControl`: a `computed` read
 * plus an explicit setter, never a local writable shadowing it. That distinction is behavioural,
 * not stylistic — mirroring a local signal into the store would record the *seed* as if it were a
 * choice on first mount, and `pickGranularityForSpan` would then never run again for the session
 * even though the user never touched the picker.
 *
 * `seed()` is snapshotted once, at mount, so a later range change doesn't move a bucket size out
 * from under the user mid-visit — TICKET-STAT-15's "defaults on first render, independent
 * thereafter", unchanged.
 *
 * Must be called from an injection context — a component field initializer — same as
 * `pageRangeControl` and `balanceTrendSignals`.
 */
export const chartGranularity = (
  chart: ChartOptionsKey,
  seed: () => Granularity,
): ChartGranularityControl => {
  const chartOptions = inject(ChartOptionsStore);
  const initial = untracked(seed);

  return {
    value: computed(() => chartOptions.granularity(chart) ?? initial),
    set: (granularity: Granularity): void => chartOptions.setGranularity(chart, granularity),
  };
};

export type ChartCycleControl = {
  value: Signal<CycleKey>;
  set: (cycle: CycleKey) => void;
};

/**
 * A heatmap's calendar-cycle control, held for the session (TICKET-STAT-30) — the same shape and
 * the same reasoning as `chartGranularity` above: a `computed()` read over the store plus an
 * explicit setter, never a local writable mirrored into it, so the seed can't be recorded as if it
 * were the user's choice.
 *
 * Must be called from an injection context — a component field initializer.
 */
export const chartCycle = (chart: ChartOptionsKey, seed: () => CycleKey): ChartCycleControl => {
  const chartOptions = inject(ChartOptionsStore);
  const initial = untracked(seed);

  return {
    value: computed(() => chartOptions.cycle(chart) ?? initial),
    set: (cycle: CycleKey): void => chartOptions.setCycle(chart, cycle),
  };
};

/** Structurally echarts' `legendselectchanged` payload — the map of every legend entry to whether it is currently shown. */
export type LegendSelectChangedEvent = { selected?: Record<string, boolean> };

export type ChartSeriesFilter = {
  /** Feed straight into the option builder, which turns it into `legend.selected`. */
  hidden: Signal<readonly string[]>;
  onLegendSelectChanged: (event: LegendSelectChangedEvent) => void;
};

/** The names echarts reports as *not* shown. Pure, so the event shape is testable without a chart. */
export const hiddenSeriesFromEvent = ({ selected }: LegendSelectChangedEvent): string[] =>
  Object.entries(selected ?? {})
    .filter(([, shown]) => !shown)
    .map(([name]) => name);

/**
 * Makes a chart's legend selection explicit app state instead of echarts-internal state
 * (TICKET-STAT-27). `seriesNames` is the chart's *current* series list: it both prunes names that
 * have left the chart (a deleted account, a category that dropped out of the top 5) and is the
 * signal that keeps that pruning up to date as the data changes.
 *
 * Must be called from an injection context — a component field initializer.
 */
export const chartSeriesFilter = (
  chart: ChartOptionsKey,
  seriesNames: Signal<readonly string[]>,
): ChartSeriesFilter => {
  const chartOptions = inject(ChartOptionsStore);

  // `untracked` around the write: `pruneHiddenSeries` reads the whole `byChart` map, so tracking it
  // would make this effect depend on every other chart's options — one chart's zoom drag would
  // re-run every mounted chart's prune, and each prune's own write would re-trigger itself.
  effect(() => {
    const names = seriesNames();
    untracked(() => chartOptions.pruneHiddenSeries(chart, names));
  });

  return {
    hidden: computed(() => chartOptions.hiddenSeries(chart)),
    onLegendSelectChanged: (event: LegendSelectChangedEvent): void => {
      chartOptions.setHiddenSeries(chart, hiddenSeriesFromEvent(event));
    },
  };
};

/** Structurally echarts' `datazoom` payload: the slider reports on the event itself, the inside-zoom through a `batch`. */
export type DataZoomEvent = {
  start?: number;
  end?: number;
  batch?: readonly { start?: number; end?: number }[];
};

/** Where the bounds actually sit: the slider puts them on the event, the inside-zoom in a `batch`. */
const zoomBounds = (event: DataZoomEvent): { start?: number; end?: number } =>
  event.batch?.[0] ?? event;

/** The dragged window as percentages, or `undefined` for an event that carries none. Pure, so both payload shapes are testable without a chart. */
export const zoomFromEvent = (event: DataZoomEvent): ChartZoomByPercent | undefined => {
  const { start, end } = zoomBounds(event);
  if (typeof start !== 'number' || typeof end !== 'number') return undefined;
  return { start, end };
};

export type ChartZoomControl = {
  /** The user's own window when they have dragged one, else `undefined` — the chart then keeps its range-scrubbed default. */
  manual: Signal<ChartZoomByPercent | undefined>;
  onDataZoom: (event: DataZoomEvent) => void;
};

/**
 * Keeps a hand-dragged `dataZoom` window for the session (TICKET-STAT-27) — the third choice the
 * `notMerge` rebuild used to discard, alongside the bucket size and the legend selection.
 *
 * Must be called from an injection context — a component field initializer.
 */
export const chartZoomControl = (chart: ChartOptionsKey): ChartZoomControl => {
  const chartOptions = inject(ChartOptionsStore);

  return {
    manual: computed(() => chartOptions.zoom(chart)),
    onDataZoom: (event: DataZoomEvent): void => {
      const zoom = zoomFromEvent(event);
      if (zoom) chartOptions.setZoom(chart, zoom);
    },
  };
};
