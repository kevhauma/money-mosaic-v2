import { ChangeDetectionStrategy, Component, computed, inject, linkedSignal } from '@angular/core';
import { RouterLink } from '@angular/router';
import type { EChartsCoreOption } from 'echarts/core';
import { NgxEchartsDirective } from 'ngx-echarts';
import { type CategoryBreakdownEntry } from '@/core/stats';
import { AppSettingsStore, CategoriesStore, RangeStore } from '@/core/state';
import {
  resolveChartAnimation,
  CHART_NO_COLOR_FALLBACK,
  resolveChartCategoricalColors,
} from '@/shared/echarts';
import {
  AlertComponent,
  ButtonComponent,
  LoadingSkeletonComponent,
  PaperComponent,
  PrivacyBlurComponent,
  TypographyComponent,
} from '@/shared/ui';
import {
  buildTransactionDrilldownParams,
  formatCurrency,
  formatPercent,
  UNCATEGORISED_SENTINEL,
} from '@/shared/utils';
import { StatsStore } from '../../stats.store';

type BreakdownKind = 'expense' | 'income';

const TOP_ENTRY_COUNT = 5;

/**
 * How many rows a "Show more" has to be hiding before it is worth the click (TICKET-STAT-44). At
 * one or two, the disclosure costs more than the rows it saves — a UX review found a
 * "Show more (1)" sitting over a single line — so below this the column simply lists everything.
 */
const DISCLOSURE_MIN_HIDDEN = 3;

/** Below this, a donut would be drawing a category as a proportion of itself (TICKET-STAT-44). */
const MIN_ENTRIES_FOR_CHART = 2;

/** Breakdown entry with category name/colour and formatted figures joined once, so the template stays method-free (CR-2.5). */
type BreakdownEntryVm = {
  categoryId: number | null;
  total: number;
  name: string;
  color: string;
  formattedTotal: string;
  formattedShare: string;
};

/** The "€X uncategorised (Y% of expense, N transactions)" callout under the expense column (TICKET-STAT-09). */
type UncategorisedCalloutVm = {
  formattedTotal: string;
  formattedShare: string;
  /** Already pluralised — a template states facts, it doesn't derive them (CR-2.5). */
  countLabel: string;
};

/** The one-category case (TICKET-STAT-44): what the panel says instead of drawing a full ring. */
type SoleEntryVm = {
  name: string;
  formattedTotal: string;
  note: string;
};

/** One donut+list column's full render state (TICKET-STAT-13), joined once so the template only iterates, never branches on `kind`. */
type BreakdownColumnVm = {
  kind: BreakdownKind;
  label: string;
  entries: BreakdownEntryVm[];
  visibleEntries: BreakdownEntryVm[];
  remainingCount: number;
  expanded: boolean;
  toggleLabel: string;
  chartOption: EChartsCoreOption;
  emptyStateText: string;
  /**
   * Only ever set on the expense column, and only when something is actually uncategorised
   * (TICKET-STAT-09) — carried here rather than read separately in the template, so the template
   * has no `kind` test of its own to make.
   */
  uncategorisedCallout: UncategorisedCalloutVm | null;
  /**
   * `null` unless this column has exactly one entry, in which case the donut is replaced by it
   * (TICKET-STAT-44) — a single 100% slice is a complete ring stating one number the list below
   * already states, and it costs half the card to do it.
   */
  soleEntry: SoleEntryVm | null;
};

/** Shape of an item-trigger tooltip callback param echarts actually passes â€” only the fields the pie formatter reads. */
type PieTooltipParam = {
  marker?: string;
  name: string;
  data: { formattedTotal: string };
};

/**
 * Item-trigger (`trigger: 'item'`) pie tooltip formatter (TICKET-STAT-12): reuses the hovered
 * slice's already-formatted total instead of re-formatting `entry.total`, so the tooltip can't
 * drift from the list rendered below the chart. Extracted to a standalone, explicitly-typed
 * function (rather than an inline arrow) because echarts' overloaded `TooltipFormatterCallback`
 * type can't be contextually inferred, which otherwise leaves `params` an implicit `any`.
 */
const formatPieTooltip = (params: PieTooltipParam): string => {
  const { marker, name, data } = params;
  return `${marker ?? ''}${name}: ${data.formattedTotal}`;
};

/**
 * What a one-entry column says where its donut would have been (TICKET-STAT-44) — the figure
 * itself, plus why there is no chart. Worded per kind rather than generically: "one source" is what
 * an income column has one of, and "one category" is what an expense column has.
 */
const soleEntryVm = (kind: BreakdownKind, entry: BreakdownEntryVm): SoleEntryVm => ({
  name: entry.name,
  formattedTotal: entry.formattedTotal,
  note:
    kind === 'income'
      ? 'All of this range’s income, from one source — nothing to split.'
      : 'All of this range’s spending, in one category — nothing to split.',
});

/** Side-by-side donut + expandable list for the selected range's expense-by-category and income-by-source (FR-STAT-3). */
@Component({
  selector: 'app-category-breakdown-panel',
  imports: [
    RouterLink,
    NgxEchartsDirective,
    AlertComponent,
    ButtonComponent,
    LoadingSkeletonComponent,
    PaperComponent,
    PrivacyBlurComponent,
    TypographyComponent,
  ],
  templateUrl: './category-breakdown-panel.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CategoryBreakdownPanelComponent {
  private readonly statsStore = inject(StatsStore);
  private readonly categoriesStore = inject(CategoriesStore);
  protected readonly rangeStore = inject(RangeStore);

  /** Blurs the per-category totals/shares while privacy mode is on (TICKET-PRIV-01); the donut and the category names stay. */
  protected readonly privacyMode = inject(AppSettingsStore).privacyModeEnabled;

  /** `TransactionsStore` hydrates in the background (TICKET-PERF-05) â€” gates the columns below so a still-loading range doesn't briefly read as "no data". */
  protected readonly dataReady = this.statsStore.dataReady;

  /** Combined range key so `expandedColumns` below resets whenever either bound changes. */
  private readonly rangeKey = computed(
    () => `${this.rangeStore.from('dashboard')}|${this.rangeStore.to('dashboard')}`,
  );

  /**
   * Per-column "show more" state (TICKET-STAT-13) â€” expanding one column never affects the
   * other. A `linkedSignal` rather than a plain `signal` + effect: it resets to an empty set
   * whenever `rangeKey` changes (new range â†’ collapse both columns) while still supporting a
   * local `.update()` for the toggle, matching the reset-on-source-change pattern already used
   * by `createPagination`'s `resetOn` (`shared/utils/pagination.ts`).
   */
  protected readonly expandedColumns = linkedSignal<string, ReadonlySet<BreakdownKind>>({
    source: this.rangeKey,
    computation: () => new Set<BreakdownKind>(),
  });

  private readonly expenseEntries = computed<BreakdownEntryVm[]>(() =>
    this.mapEntries(this.statsStore.categoryBreakdown().expenseByCategory),
  );

  private readonly incomeEntries = computed<BreakdownEntryVm[]>(() =>
    this.mapEntries(this.statsStore.categoryBreakdown().incomeBySource),
  );

  protected readonly columns = computed<BreakdownColumnVm[]>(() => {
    const expanded = this.expandedColumns();
    return [
      this.buildColumn('income', 'Income', this.incomeEntries(), expanded.has('income')),
      this.buildColumn('expense', 'Expense', this.expenseEntries(), expanded.has('expense')),
    ];
  });

  /** Range-scoped, monetary read of the uncategorised entry already computed by categoryBreakdown (TICKET-STAT-09). Handed to the expense column; `null` when nothing is uncategorised. */
  private readonly uncategorisedCallout = computed<UncategorisedCalloutVm | null>(() => {
    const entry = this.statsStore
      .categoryBreakdown()
      .expenseByCategory.find((e) => e.categoryId === null);
    if (!entry || entry.total === 0) return null;

    return {
      formattedTotal: formatCurrency(entry.total),
      formattedShare: formatPercent(entry.share),
      countLabel: `${entry.transactionCount} transaction${entry.transactionCount === 1 ? '' : 's'}`,
    };
  });

  protected readonly viewAllQueryParams = computed(() => ({
    from: this.rangeStore.from('dashboard'),
    to: this.rangeStore.to('dashboard'),
  }));

  protected drilldownParams(categoryId: number | null): Record<string, string> {
    return buildTransactionDrilldownParams({
      from: this.rangeStore.from('dashboard'),
      to: this.rangeStore.to('dashboard'),
      categoryId: categoryId ?? UNCATEGORISED_SENTINEL,
    });
  }

  protected toggleColumn(kind: BreakdownKind): void {
    this.expandedColumns.update((current) => {
      const next = new Set(current);
      if (next.has(kind)) next.delete(kind);
      else next.add(kind);
      return next;
    });
  }

  private mapEntries(raw: CategoryBreakdownEntry[]): BreakdownEntryVm[] {
    const categoriesById = this.categoriesStore.categoriesById();

    return raw.map((entry) => {
      const category = entry.categoryId != null ? categoriesById.get(entry.categoryId) : undefined;
      return {
        categoryId: entry.categoryId,
        total: entry.total,
        name: entry.categoryId != null ? (category?.name ?? 'Unknown') : 'Uncategorised',
        color:
          entry.categoryId != null
            ? (category?.color ?? CHART_NO_COLOR_FALLBACK)
            : CHART_NO_COLOR_FALLBACK,
        formattedTotal: formatCurrency(entry.total),
        formattedShare: formatPercent(entry.share),
      };
    });
  }

  private buildColumn(
    kind: BreakdownKind,
    label: string,
    entries: BreakdownEntryVm[],
    expanded: boolean,
  ): BreakdownColumnVm {
    const hiddenCount = Math.max(entries.length - TOP_ENTRY_COUNT, 0);
    // One or two hidden rows are cheaper to just show than to put behind a click, so the column
    // stops being collapsible at all rather than offering a "Show more (1)" (TICKET-STAT-44).
    const collapsible = hiddenCount >= DISCLOSURE_MIN_HIDDEN;
    return {
      kind,
      label,
      entries,
      visibleEntries: collapsible && !expanded ? entries.slice(0, TOP_ENTRY_COUNT) : entries,
      remainingCount: collapsible ? hiddenCount : 0,
      expanded,
      toggleLabel: expanded ? 'Show less' : `Show more (${hiddenCount})`,
      chartOption: this.buildChartOption(entries),
      emptyStateText: `No ${kind} data for this range.`,
      uncategorisedCallout: kind === 'expense' ? this.uncategorisedCallout() : null,
      soleEntry:
        entries.length > 0 && entries.length < MIN_ENTRIES_FOR_CHART
          ? soleEntryVm(kind, entries[0])
          : null,
    };
  }

  private buildChartOption(entries: BreakdownEntryVm[]): EChartsCoreOption {
    return {
      ...resolveChartAnimation(),
      color: resolveChartCategoricalColors(),
      tooltip: { trigger: 'item', formatter: formatPieTooltip },
      series: [
        {
          type: 'pie',
          radius: ['40%', '70%'],
          // Slice labels off entirely (TICKET-STAT-44). echarts' default puts them outside on
          // leader lines, where they collide and truncate mid-word ("Groceri…") as soon as several
          // categories are present at dashboard-column width. The list below already names every
          // slice, with its total and its share, and now carries the slice's colour as a swatch —
          // so the label moved there rather than being made smaller and still illegible.
          label: { show: false },
          data: entries.map((entry) => ({
            name: entry.name,
            value: entry.total,
            itemStyle: { color: entry.color },
            formattedTotal: entry.formattedTotal,
          })),
        },
      ],
    };
  }
}
