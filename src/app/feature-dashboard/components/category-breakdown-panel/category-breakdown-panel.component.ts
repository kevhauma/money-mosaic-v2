import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import type { EChartsCoreOption } from 'echarts/core';
import { NgxEchartsDirective } from 'ngx-echarts';
import { RangeStore } from '@/core/stats';
import { CategoriesStore } from '@/feature-categories';
import { buildTransactionDrilldownParams, UNCATEGORISED_SENTINEL } from '@/shared/utils';
import { StatsStore } from '../../stats.store';

type BreakdownKind = 'expense' | 'income';

const EUR_FORMATTER = new Intl.NumberFormat('en-BE', { style: 'currency', currency: 'EUR' });
const PERCENT_FORMATTER = new Intl.NumberFormat('en-BE', {
  style: 'percent',
  maximumFractionDigits: 1,
});

/** Donut + top-5 list for the selected range's expense-by-category or income-by-source (FR-STAT-3). */
@Component({
  selector: 'app-category-breakdown-panel',
  imports: [RouterLink, NgxEchartsDirective],
  templateUrl: './category-breakdown-panel.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CategoryBreakdownPanelComponent {
  private readonly statsStore = inject(StatsStore);
  private readonly categoriesStore = inject(CategoriesStore);
  protected readonly rangeStore = inject(RangeStore);

  protected readonly kind = signal<BreakdownKind>('expense');

  protected readonly entries = computed(() => {
    const breakdown = this.statsStore.categoryBreakdown();
    return this.kind() === 'expense' ? breakdown.expenseByCategory : breakdown.incomeBySource;
  });

  protected readonly topEntries = computed(() => this.entries().slice(0, 5));

  protected readonly chartOption = computed<EChartsCoreOption>(() => ({
    tooltip: { trigger: 'item' },
    series: [
      {
        type: 'pie',
        radius: ['40%', '70%'],
        data: this.entries().map((entry) => ({
          name: this.categoryName(entry.categoryId),
          value: entry.total,
          itemStyle: { color: this.categoryColor(entry.categoryId) },
        })),
      },
    ],
  }));

  protected readonly viewAllQueryParams = computed(() => ({
    from: this.rangeStore.from(),
    to: this.rangeStore.to(),
  }));

  protected categoryName(categoryId: number | null): string {
    return categoryId != null
      ? (this.categoriesStore.categoriesById().get(categoryId)?.name ?? 'Unknown')
      : 'Uncategorised';
  }

  protected categoryColor(categoryId: number | null): string {
    return categoryId != null
      ? (this.categoriesStore.categoriesById().get(categoryId)?.color ?? '#9ca3af')
      : '#9ca3af';
  }

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

  protected formatTotal(total: number): string {
    return EUR_FORMATTER.format(total);
  }

  protected formatShare(share: number): string {
    return PERCENT_FORMATTER.format(share);
  }
}
