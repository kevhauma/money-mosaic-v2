import { ChangeDetectionStrategy, Component, computed, inject, linkedSignal } from '@angular/core';
import { RouterLink } from '@angular/router';
import type { EChartsCoreOption } from 'echarts/core';
import { NgxEchartsDirective } from 'ngx-echarts';
import { RangeStore, type CategoryBreakdownEntry } from '@/core/stats';
import { CategoriesStore } from '@/core/state';
import {
  CHART_ANIMATION,
  CHART_NO_COLOR_FALLBACK,
  resolveChartCategoricalColors,
} from '@/shared/echarts';
import {
  AlertComponent,
  ButtonComponent,
  LoadingSkeletonComponent,
  PaperComponent,
  TypographyComponent,
  DividerComponent,
} from '@/shared/ui';
import {
  buildTransactionDrilldownParams,
  formatCurrency,
  UNCATEGORISED_SENTINEL,
} from '@/shared/utils';
import { StatsStore } from '../../stats.store';

type BreakdownKind = 'expense' | 'income';

const TOP_ENTRY_COUNT = 5;

/** Breakdown entry with category name/colour and formatted figures joined once, so the template stays method-free (CR-2.5). */
type BreakdownEntryVm = {
  categoryId: number | null;
  total: number;
  name: string;
  color: string;
  formattedTotal: string;
  formattedShare: string;
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
};

/** Shape of an item-trigger tooltip callback param echarts actually passes — only the fields the pie formatter reads. */
type PieTooltipParam = {
  marker?: string;
  name: string;
  data: { formattedTotal: string };
};

const PERCENT_FORMATTER = new Intl.NumberFormat('en-BE', {
  style: 'percent',
  maximumFractionDigits: 1,
});

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
    TypographyComponent,
    DividerComponent,
  ],
  templateUrl: './category-breakdown-panel.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CategoryBreakdownPanelComponent {
  private readonly statsStore = inject(StatsStore);
  private readonly categoriesStore = inject(CategoriesStore);
  protected readonly rangeStore = inject(RangeStore);

  /** `TransactionsStore` hydrates in the background (TICKET-PERF-05) — gates the columns below so a still-loading range doesn't briefly read as "no data". */
  protected readonly dataReady = this.statsStore.dataReady;

  /** Combined range key so `expandedColumns` below resets whenever either bound changes. */
  private readonly rangeKey = computed(() => `${this.rangeStore.from()}|${this.rangeStore.to()}`);

  /**
   * Per-column "show more" state (TICKET-STAT-13) — expanding one column never affects the
   * other. A `linkedSignal` rather than a plain `signal` + effect: it resets to an empty set
   * whenever `rangeKey` changes (new range → collapse both columns) while still supporting a
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
      this.buildColumn('expense', 'Expense', this.expenseEntries(), expanded.has('expense')),
      this.buildColumn('income', 'Income', this.incomeEntries(), expanded.has('income')),
    ];
  });

  /** Range-scoped, monetary read of the uncategorised entry already computed by categoryBreakdown (TICKET-STAT-09). Rendered under the expense column; hidden when nothing is uncategorised. */
  protected readonly uncategorisedCallout = computed(() => {
    const entry = this.statsStore
      .categoryBreakdown()
      .expenseByCategory.find((e) => e.categoryId === null);
    if (!entry || entry.total === 0) return null;

    return {
      formattedTotal: formatCurrency(entry.total),
      formattedShare: PERCENT_FORMATTER.format(entry.share),
      transactionCount: entry.transactionCount,
    };
  });

  protected readonly viewAllQueryParams = computed(() => ({
    from: this.rangeStore.from(),
    to: this.rangeStore.to(),
  }));

  protected drilldownParams(categoryId: number | null): Record<string, string> {
    return buildTransactionDrilldownParams({
      from: this.rangeStore.from(),
      to: this.rangeStore.to(),
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
        formattedShare: PERCENT_FORMATTER.format(entry.share),
      };
    });
  }

  private buildColumn(
    kind: BreakdownKind,
    label: string,
    entries: BreakdownEntryVm[],
    expanded: boolean,
  ): BreakdownColumnVm {
    const remainingCount = Math.max(entries.length - TOP_ENTRY_COUNT, 0);
    return {
      kind,
      label,
      entries,
      visibleEntries: expanded ? entries : entries.slice(0, TOP_ENTRY_COUNT),
      remainingCount,
      expanded,
      toggleLabel: expanded ? 'Show less' : `Show more (${remainingCount})`,
      chartOption: this.buildChartOption(entries),
      emptyStateText: `No ${kind} data for this range.`,
    };
  }

  private buildChartOption(entries: BreakdownEntryVm[]): EChartsCoreOption {
    return {
      ...CHART_ANIMATION,
      color: resolveChartCategoricalColors(),
      tooltip: { trigger: 'item', formatter: formatPieTooltip },
      series: [
        {
          type: 'pie',
          radius: ['40%', '70%'],
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
