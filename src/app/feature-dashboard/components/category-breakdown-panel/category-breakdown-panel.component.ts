import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import type { EChartsCoreOption } from 'echarts/core';
import { NgxEchartsDirective } from 'ngx-echarts';
import { RangeStore } from '@/core/stats';
import { CategoriesStore } from '@/feature-categories';
import { AlertComponent } from '@/shared/ui';
import {
  buildTransactionDrilldownParams,
  formatCurrency,
  UNCATEGORISED_SENTINEL,
} from '@/shared/utils';
import { StatsStore } from '../../stats.store';

type BreakdownKind = 'expense' | 'income';

/** Breakdown entry with category name/colour and formatted figures joined once, so the template stays method-free (CR-2.5). */
type BreakdownEntryVm = {
  categoryId: number | null;
  total: number;
  name: string;
  color: string;
  formattedTotal: string;
  formattedShare: string;
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

/** Donut + top-5 list for the selected range's expense-by-category or income-by-source (FR-STAT-3). */
@Component({
  selector: 'app-category-breakdown-panel',
  imports: [RouterLink, NgxEchartsDirective, AlertComponent],
  templateUrl: './category-breakdown-panel.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CategoryBreakdownPanelComponent {
  private readonly statsStore = inject(StatsStore);
  private readonly categoriesStore = inject(CategoriesStore);
  protected readonly rangeStore = inject(RangeStore);

  protected readonly kind = signal<BreakdownKind>('expense');

  protected readonly entries = computed<BreakdownEntryVm[]>(() => {
    const breakdown = this.statsStore.categoryBreakdown();
    const raw = this.kind() === 'expense' ? breakdown.expenseByCategory : breakdown.incomeBySource;
    const categoriesById = this.categoriesStore.categoriesById();

    return raw.map((entry) => {
      const category = entry.categoryId != null ? categoriesById.get(entry.categoryId) : undefined;
      return {
        categoryId: entry.categoryId,
        total: entry.total,
        name: entry.categoryId != null ? (category?.name ?? 'Unknown') : 'Uncategorised',
        color: entry.categoryId != null ? (category?.color ?? '#9ca3af') : '#9ca3af',
        formattedTotal: formatCurrency(entry.total),
        formattedShare: PERCENT_FORMATTER.format(entry.share),
      };
    });
  });

  protected readonly topEntries = computed(() => this.entries().slice(0, 5));

  /** Range-scoped, monetary read of the uncategorised entry already computed by categoryBreakdown (TICKET-STAT-09). Hidden outside the expense tab or when nothing is uncategorised. */
  protected readonly uncategorisedCallout = computed(() => {
    if (this.kind() !== 'expense') return null;
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

  protected readonly chartOption = computed<EChartsCoreOption>(() => ({
    tooltip: { trigger: 'item', formatter: formatPieTooltip },
    series: [
      {
        type: 'pie',
        radius: ['40%', '70%'],
        data: this.entries().map((entry) => ({
          name: entry.name,
          value: entry.total,
          itemStyle: { color: entry.color },
          formattedTotal: entry.formattedTotal,
        })),
      },
    ],
  }));

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

  protected setKind(kind: BreakdownKind): void {
    this.kind.set(kind);
  }
}
