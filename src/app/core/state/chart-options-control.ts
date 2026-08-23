import { computed, effect, inject, untracked, type Signal } from '@angular/core';
import type { StatsJointMode } from '@/core/stats';
import type { ChartZoomByPercent } from '@/shared/echarts';
import type { CycleKey, Granularity } from '@/shared/utils';
import { ChartOptionsStore, type BillsView, type ChartOptionsKey } from './chart-options.store';

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

export type ChartGroupCategoriesControl = {
  value: Signal<boolean>;
  set: (groupCategories: boolean) => void;
};

/**
 * The money flow Sankey's "Group categories" toggle, held for the session (TICKET-EXP-03) — same
 * shape and same reasoning as the two controls above: a `computed()` read over the store plus an
 * explicit setter, never a local writable mirrored into it, so the seed can't be recorded as if it
 * were the user's choice.
 *
 * Must be called from an injection context — a component field initializer.
 */
export const chartGroupCategories = (
  chart: ChartOptionsKey,
  seed: () => boolean,
): ChartGroupCategoriesControl => {
  const chartOptions = inject(ChartOptionsStore);
  const initial = untracked(seed);

  return {
    value: computed(() => chartOptions.groupCategories(chart) ?? initial),
    set: (groupCategories: boolean): void =>
      chartOptions.setGroupCategories(chart, groupCategories),
  };
};

export type ChartJointModeControl = {
  value: Signal<StatsJointMode>;
  set: (jointMode: StatsJointMode) => void;
};

/**
 * Whether a chart reads joint accounts at the user's own share or at their full amounts, held for
 * the session — same shape and same reasoning as the controls above: a `computed()` read over the
 * store plus an explicit setter, never a local writable mirrored into it.
 *
 * Unlike the toggles beside it this one changes the *figures*, not the layout, so a chart that
 * offers it has to say which mode it is in wherever it states its totals — a caption, an aria-label,
 * an `sr-only` table. Session-scoped rather than persisted, like everything else in this store: a
 * mode the user forgot they flipped would read as the app quietly disagreeing with the Dashboard.
 *
 * Must be called from an injection context — a component field initializer.
 */
export const chartJointMode = (
  chart: ChartOptionsKey,
  seed: () => StatsJointMode,
): ChartJointModeControl => {
  const chartOptions = inject(ChartOptionsStore);
  const initial = untracked(seed);

  return {
    value: computed(() => chartOptions.jointMode(chart) ?? initial),
    set: (jointMode: StatsJointMode): void => chartOptions.setJointMode(chart, jointMode),
  };
};

export type ChartVisibleMonthControl = {
  /** A `YYYY-MM` bucket key. */
  value: Signal<string>;
  set: (visibleMonth: string) => void;
};

/**
 * The month a bill calendar is browsing, held for the session (TICKET-REC-03) — same shape and
 * reasoning as the controls above: a `computed()` read over the store plus an explicit setter,
 * never a local writable mirrored into it.
 *
 * Not a `RangeStore` key on purpose: this section looks *forward* from today at projections, while
 * every page range looks backward at data, so one following the other would fight the user in both
 * directions.
 *
 * Must be called from an injection context — a component field initializer.
 */
export const chartVisibleMonth = (
  chart: ChartOptionsKey,
  seed: () => string,
): ChartVisibleMonthControl => {
  const chartOptions = inject(ChartOptionsStore);
  const initial = untracked(seed);

  return {
    value: computed(() => chartOptions.visibleMonth(chart) ?? initial),
    set: (visibleMonth: string): void => chartOptions.setVisibleMonth(chart, visibleMonth),
  };
};

export type ChartBillsViewControl = {
  value: Signal<BillsView>;
  set: (view: BillsView) => void;
};

/**
 * Whether a projected-occurrence section draws a grid or a list, held for the session
 * (TICKET-REC-03). Purely presentational — both views render the identical projection, so this can
 * never change *what* is shown, only its shape.
 *
 * Must be called from an injection context — a component field initializer.
 */
export const chartBillsView = (
  chart: ChartOptionsKey,
  seed: () => BillsView,
): ChartBillsViewControl => {
  const chartOptions = inject(ChartOptionsStore);
  const initial = untracked(seed);

  return {
    value: computed(() => chartOptions.billsView(chart) ?? initial),
    set: (view: BillsView): void => chartOptions.setBillsView(chart, view),
  };
};

export type ChartStackedControl = {
  value: Signal<boolean>;
  set: (stacked: boolean) => void;
};

/**
 * Whether a multi-series balance chart stacks its bands into a running total, held for the session
 * (TICKET-ACC-12) — same shape and reasoning as the controls above: a `computed()` read over the
 * store plus an explicit setter.
 *
 * Like `chartJointMode` this one changes what a plotted y-value *means* rather than how it looks, so
 * a chart that offers it has to say which mode it is in — the stacked view is the one that needs the
 * caption, because its top edge is a total no single account holds.
 *
 * Must be called from an injection context — a component field initializer.
 */
export const chartStacked = (chart: ChartOptionsKey, seed: () => boolean): ChartStackedControl => {
  const chartOptions = inject(ChartOptionsStore);
  const initial = untracked(seed);

  return {
    value: computed(() => chartOptions.stacked(chart) ?? initial),
    set: (stacked: boolean): void => chartOptions.setStacked(chart, stacked),
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
