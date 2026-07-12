import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import type { EChartsCoreOption } from 'echarts/core';
import { NgxEchartsDirective } from 'ngx-echarts';
import { RangeStore } from '@/core/stats';
import { CategoriesStore } from '@/feature-categories';
import { AlertComponent } from '@/shared/ui';
import { buildTransactionDrilldownParams, UNCATEGORISED_SENTINEL } from '@/shared/utils';
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

const EUR_FORMATTER = new Intl.NumberFormat('en-BE', { style: 'currency', currency: 'EUR' });
const PERCENT_FORMATTER = new Intl.NumberFormat('en-BE', {
  style: 'percent',
  maximumFractionDigits: 1,
});

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
        formattedTotal: EUR_FORMATTER.format(entry.total),
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
      formattedTotal: EUR_FORMATTER.format(entry.total),
      formattedShare: PERCENT_FORMATTER.format(entry.share),
      transactionCount: entry.transactionCount,
    };
  });

  protected readonly chartOption = computed<EChartsCoreOption>(() => ({
    tooltip: { trigger: 'item' },
    series: [
      {
        type: 'pie',
        radius: ['40%', '70%'],
        data: this.entries().map((entry) => ({
          name: entry.name,
          value: entry.total,
          itemStyle: { color: entry.color },
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
