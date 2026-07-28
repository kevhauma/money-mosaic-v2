import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { tablerTriangleFill, tablerTriangleInvertedFill } from '@ng-icons/tabler-icons/fill';
import {
  ButtonComponent,
  DropdownComponent,
  FlexComponent,
  LabelComponent,
  PaperComponent,
  TypographyComponent,
} from '@/shared/ui';
import {
  buildTransactionDrilldownParams,
  formatAlignedRangeLabel,
  formatCurrency,
  formatDate,
  formatPercent,
  UNCATEGORISED_SENTINEL,
} from '@/shared/utils';
import { CategoriesStore } from '@/core/state';
import { CategoryComparisonSettingsStore } from '../../category-comparison-settings.store';
import { StatsStore } from '../../stats.store';

/** One drill-down-linked bar in a category's mini chart, with its height pre-scaled to the category's own window max. */
type ComparisonBarVm = {
  key: string;
  formattedTotal: string;
  periodLabel: string;
  tooltipLabel: string;
  heightPercent: number;
  isSelected: boolean;
  queryParams: Record<string, string>;
};

/** A comparison category with figures/links joined once, so the template stays method-free (CR-2.5). */
type CategoryComparisonVm = {
  categoryId: number | null;
  name: string;
  color: string;
  bars: ComparisonBarVm[];
  formattedAverage: string;
  formattedHighest: string;
  formattedLowest: string;
  deltaLabel: string | null;
  deltaTone: 'warning' | 'success' | undefined;
  deltaDirection: 'up' | 'down' | null;
};

/** One row in the "exclude categories" checklist. */
type ExcludableCategoryVm = {
  id: number;
  name: string;
  excluded: boolean;
};

/**
 * Top expense categories for the selected range, each compared against the nearest same-length
 * periods (FR-STAT-8), reusing `StatsStore.categoryPeriodComparison`. Hidden entirely when the
 * store returns `null` (the `all-time` preset has no "previous all-time" to compare against);
 * shows an explanatory empty state when fewer than 2 window periods have any transaction data
 * (TICKET-STAT-04). The user can optionally exclude specific expense categories from ever being
 * picked for the comparison (e.g. a dominant fixed cost that isn't interesting to track
 * period-over-period) — persisted via `CategoryComparisonSettingsStore` so it survives a reload.
 */
@Component({
  selector: 'app-category-comparison-panel',
  imports: [
    RouterLink,
    NgIcon,
    ButtonComponent,
    DropdownComponent,
    FlexComponent,
    LabelComponent,
    PaperComponent,
    TypographyComponent,
  ],
  templateUrl: './category-comparison-panel.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  viewProviders: [provideIcons({ tablerTriangleFill, tablerTriangleInvertedFill })],
})
export class CategoryComparisonPanelComponent {
  private readonly statsStore = inject(StatsStore);
  private readonly categoriesStore = inject(CategoriesStore);
  private readonly categoryComparisonSettingsStore = inject(CategoryComparisonSettingsStore);

  protected readonly comparison = computed(() => this.statsStore.categoryPeriodComparison());

  protected readonly categories = computed<CategoryComparisonVm[]>(() => {
    const comparison = this.comparison();
    if (!comparison) return [];

    return comparison.entries.map((entry) => {
      const max = Math.max(entry.highest, ...entry.perPeriod);

      const bars: ComparisonBarVm[] = entry.perPeriod.map((total, index) => {
        const period = comparison.window[index];
        const formattedTotal = formatCurrency(total);
        const periodLabel =
          formatAlignedRangeLabel(period.from, period.to) ??
          `${formatDate(period.from)} – ${formatDate(period.to)}`;
        return {
          key: period.from,
          formattedTotal,
          periodLabel,
          tooltipLabel: `${periodLabel}\n${formattedTotal}`,
          heightPercent: max === 0 ? 0 : (total / max) * 100,
          isSelected: period.isSelected,
          queryParams: buildTransactionDrilldownParams({
            from: period.from,
            to: period.to,
            categoryId: entry.categoryId ?? UNCATEGORISED_SENTINEL,
          }),
        };
      });

      const deltaTone: 'warning' | 'success' | undefined =
        entry.deltaVsAveragePct == null || entry.deltaVsAveragePct === 0
          ? undefined
          : entry.deltaVsAveragePct > 0
            ? 'warning'
            : 'success';

      return {
        categoryId: entry.categoryId,
        name: entry.name,
        color: entry.color,
        bars,
        formattedAverage: formatCurrency(entry.average),
        formattedHighest: formatCurrency(entry.highest),
        formattedLowest: formatCurrency(entry.lowest),
        deltaLabel:
          entry.deltaVsAveragePct == null
            ? null
            : formatPercent(entry.deltaVsAveragePct, 'sign-by-icon'),
        deltaTone,
        deltaDirection:
          entry.deltaVsAveragePct == null || entry.deltaVsAveragePct === 0
            ? null
            : entry.deltaVsAveragePct > 0
              ? 'up'
              : 'down',
      };
    });
  });

  private readonly excludedCategoryIds = computed(
    () => new Set(this.categoryComparisonSettingsStore.excludedCategoryIds()),
  );

  protected readonly excludableCategories = computed<ExcludableCategoryVm[]>(() => {
    const excluded = this.excludedCategoryIds();
    return this.categoriesStore
      .activeCategories()
      .filter((category) => category.kind === 'expense')
      .map((category) => ({
        id: category.id!,
        name: category.name,
        excluded: excluded.has(category.id!),
      }));
  });

  protected readonly excludedCount = computed(
    () => this.excludableCategories().filter((category) => category.excluded).length,
  );

  protected toggleExcluded(categoryId: number, excluded: boolean): void {
    const next = new Set(this.excludedCategoryIds());
    if (excluded) next.add(categoryId);
    else next.delete(categoryId);
    this.categoryComparisonSettingsStore.setExcludedCategoryIds([...next]);
  }
}
