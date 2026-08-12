import { patchState, signalStore, withMethods, withState } from '@ngrx/signals';
import type { StatsJointMode } from '@/core/stats';
import type { ChartZoomByPercent } from '@/shared/echarts';
import type { CycleKey, Granularity } from '@/shared/utils';

/**
 * Every chart that remembers its own options for the session (TICKET-STAT-27). Adding one here is
 * the whole cost of giving a new chart a memory; a chart that isn't listed keeps its per-mount
 * defaults.
 *
 * `dashboard-trend` is the trend panel's *shared* bucket size — one picker drives both columns —
 * while `dashboard-trend-income`/`dashboard-trend-expense` are the two columns' own legends, which
 * the user toggles independently.
 *
 * The account-*detail* balance chart has no key at all: it is single-series (no legend), its bucket
 * size is fixed to daily (TICKET-ACC-10), and it deliberately takes no `chartZoomControl` — one key
 * would be shared by every account's detail page, so account A's dragged window would open on
 * account B.
 */
export type ChartOptionsKey =
  | 'accounts-balance-history'
  | 'dashboard-trend'
  | 'dashboard-trend-income'
  | 'dashboard-trend-expense'
  | 'dashboard-heatmap'
  | 'explore-money-flow'
  | 'explore-spending-mosaic'
  | 'recurring-bills-calendar'
  | 'income-by-category';

/** How a projected-occurrence section draws the same month: as a grid, or as a date-ordered list (TICKET-REC-03). */
export type BillsView = 'calendar' | 'list';

type ChartOptionsEntry = {
  granularity?: Granularity;
  /** Series the user toggled off, keyed by series **name** — indices shift when an account is archived or the top-5 composition changes. */
  hiddenSeries: readonly string[];
  zoom?: ChartZoomByPercent;
  /** Which repeating calendar cycle a heatmap folds onto (TICKET-STAT-30) — a *position* vocabulary, separate from `granularity`'s bucket sizes. */
  cycle?: CycleKey;
  /** Whether the money flow Sankey routes spending through `Category.group` before reaching individual categories (TICKET-EXP-03). */
  groupCategories?: boolean;
  /**
   * Whether a chart weights a joint account's transactions by the user's own `ownershipShare`
   * (`'share'`, what it costs *me*) or draws every leg at its full amount (`'raw'`, what left the
   * accounts). A per-chart question rather than an app-wide setting: it changes what the picture is
   * *of*, and only the charts that offer the switch have one.
   */
  jointMode?: StatsJointMode;
  /** Which month a bill calendar is browsing, as a `YYYY-MM` bucket key (TICKET-REC-03) — it looks *forward* from today, so it deliberately does not follow `RangeStore`. */
  visibleMonth?: string;
  /** Grid or date-ordered list, for a section that draws the same projected occurrences both ways (TICKET-REC-03). */
  billsView?: BillsView;
};

type ChartOptionsStoreState = {
  byChart: Partial<Record<ChartOptionsKey, ChartOptionsEntry>>;
};

const EMPTY_ENTRY: ChartOptionsEntry = { hiddenSeries: [] };

/**
 * Per-chart UI choices that used to be either echarts-internal or component-local (TICKET-STAT-27):
 * the bucket size, the series the user hid, and a hand-dragged zoom window. `NgxEchartsDirective`
 * applies `[options]` with `setOption(option, true)` — a `notMerge` call, which discards echarts'
 * own component state — so a chart whose option is a `computed()` lost the user's legend selection
 * every time the range or the bucket changed. Holding the selection here and *stating* it back as
 * `legend.selected` makes the replacement restore it instead of clearing it.
 *
 * Root-provided and keyed by chart id, same shape and for the same reason as `RangeStore`: several
 * features read it, and one instance per lazy route would fragment the very state that has to
 * outlive a navigation.
 *
 * **In-memory only, deliberately** (TICKET-STAT-27 note): "per session" is the requirement, so
 * there is no repository and no Dexie table behind this — it resets on reload exactly as
 * `RangeStore` does. A hidden-account filter surviving a browser restart is a different product
 * decision: someone who forgot they hid an account would read the chart as simply wrong.
 */
export const ChartOptionsStore = signalStore(
  { providedIn: 'root' },
  withState<ChartOptionsStoreState>({ byChart: {} }),
  withMethods((store) => {
    const entryFor = (chart: ChartOptionsKey): ChartOptionsEntry =>
      store.byChart()[chart] ?? EMPTY_ENTRY;

    const patchChart = (chart: ChartOptionsKey, next: Partial<ChartOptionsEntry>): void => {
      patchState(store, ({ byChart }) => ({
        byChart: { ...byChart, [chart]: { ...(byChart[chart] ?? EMPTY_ENTRY), ...next } },
      }));
    };

    return {
      /** `undefined` until the chart has stored one — the caller then seeds from `pickGranularityForSpan`. */
      granularity: (chart: ChartOptionsKey): Granularity | undefined => entryFor(chart).granularity,

      setGranularity: (chart: ChartOptionsKey, granularity: Granularity): void => {
        patchChart(chart, { granularity });
      },

      /** `undefined` until the user picks one — the caller then falls back to the chart's own default cycle (TICKET-STAT-30). */
      cycle: (chart: ChartOptionsKey): CycleKey | undefined => entryFor(chart).cycle,

      setCycle: (chart: ChartOptionsKey, cycle: CycleKey): void => {
        patchChart(chart, { cycle });
      },

      /** `undefined` until the user picks one — the caller then falls back to the chart's own default (TICKET-EXP-03). */
      groupCategories: (chart: ChartOptionsKey): boolean | undefined =>
        entryFor(chart).groupCategories,

      setGroupCategories: (chart: ChartOptionsKey, groupCategories: boolean): void => {
        patchChart(chart, { groupCategories });
      },

      /** `undefined` until the user switches — the caller then falls back to the chart's own default mode. */
      jointMode: (chart: ChartOptionsKey): StatsJointMode | undefined => entryFor(chart).jointMode,

      setJointMode: (chart: ChartOptionsKey, jointMode: StatsJointMode): void => {
        patchChart(chart, { jointMode });
      },

      /** `undefined` until the user navigates — the caller then falls back to the current month (TICKET-REC-03). */
      visibleMonth: (chart: ChartOptionsKey): string | undefined => entryFor(chart).visibleMonth,

      setVisibleMonth: (chart: ChartOptionsKey, visibleMonth: string): void => {
        patchChart(chart, { visibleMonth });
      },

      /** `undefined` until the user switches — the caller then falls back to the section's own default view (TICKET-REC-03). */
      billsView: (chart: ChartOptionsKey): BillsView | undefined => entryFor(chart).billsView,

      setBillsView: (chart: ChartOptionsKey, billsView: BillsView): void => {
        patchChart(chart, { billsView });
      },

      hiddenSeries: (chart: ChartOptionsKey): readonly string[] => entryFor(chart).hiddenSeries,

      setHiddenSeries: (chart: ChartOptionsKey, hiddenSeries: readonly string[]): void => {
        patchChart(chart, { hiddenSeries: [...hiddenSeries] });
      },

      /**
       * Drops hidden names the chart no longer draws, so a deleted or renamed account can't
       * silently suppress a future series that happens to share its name.
       *
       * An **empty** `names` is ignored rather than treated as "nothing is drawn any more": every
       * one of these charts renders once before its store has hydrated, and pruning against that
       * first empty frame would wipe the filter on every navigation back to the page — the exact
       * behaviour this ticket exists to fix.
       */
      pruneHiddenSeries: (chart: ChartOptionsKey, names: readonly string[]): void => {
        if (names.length === 0) return;

        const hiddenSeries = entryFor(chart).hiddenSeries;
        const kept = hiddenSeries.filter((name) => names.includes(name));
        if (kept.length === hiddenSeries.length) return;

        patchChart(chart, { hiddenSeries: kept });
      },

      /** `undefined` while the user hasn't dragged the slider — the chart then keeps its range-scrubbed default (TICKET-STAT-03). */
      zoom: (chart: ChartOptionsKey): ChartZoomByPercent | undefined => entryFor(chart).zoom,

      setZoom: (chart: ChartOptionsKey, zoom: ChartZoomByPercent): void => {
        patchChart(chart, { zoom });
      },
    };
  }),
);
