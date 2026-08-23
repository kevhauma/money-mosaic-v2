import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { FlexComponent, PaperComponent, TypographyComponent } from '@/shared/ui';
import {
  buildTransactionDrilldownParams,
  formatAlignedRangeLabel,
  formatCurrency,
  formatDate,
  formatPercent,
  UNCATEGORISED_SENTINEL,
} from '@/shared/utils';
import { AppSettingsStore } from '@/core/state';
import { CategoryComparisonSettingsStore } from '../../category-comparison-settings.store';
import { StatsStore } from '../../stats.store';
import type { CategoryComparisonVm, ComparisonBarVm } from '../../category-comparison-vm';
import { CategoryExclusionDropdownComponent } from '../category-exclusion-dropdown/category-exclusion-dropdown.component';
import { ComparisonCategoryCardComponent } from '../comparison-category-card/comparison-category-card.component';

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
    CategoryExclusionDropdownComponent,
    ComparisonCategoryCardComponent,
    FlexComponent,
    PaperComponent,
    TypographyComponent,
  ],
  templateUrl: './category-comparison-panel.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CategoryComparisonPanelComponent {
  private readonly statsStore = inject(StatsStore);
  private readonly categoryComparisonSettingsStore = inject(CategoryComparisonSettingsStore);

  /** Handed to each card's `[blurred]` (TICKET-PRIV-01) — the cards stay presentational, so the store read lives here. */
  protected readonly privacyMode = inject(AppSettingsStore).privacyModeEnabled;

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

      // `undefined` (no delta at all, or exactly zero — a flat "no change" reads as neither an
      // overspend warning nor a saving worth celebrating) vs. `'warning'` (spent more than
      // average) vs. `'success'` (spent less) — the VM carries the resolved color/icon directly
      // (TICKET-STAT-23) so neither this class nor the card template re-derives them from a
      // separate tone/direction pair.
      const isOverAverage = entry.deltaVsAveragePct != null && entry.deltaVsAveragePct > 0;
      const hasDelta = entry.deltaVsAveragePct != null && entry.deltaVsAveragePct !== 0;
      // A fixed cost spends the same every period, so Avg, High and Low collapse onto one figure
      // and the delta onto 0% — correct arithmetic that reads as a card failing to compute
      // (TICKET-STAT-44: the dev seed's €950 housing rendered exactly this, three times over).
      // Say the one figure once, and say that it never moved.
      const isUnchanged = entry.highest === entry.lowest;

      return {
        categoryId: entry.categoryId,
        name: entry.name,
        color: entry.color,
        bars,
        formattedFigures: isUnchanged
          ? null
          : {
              average: formatCurrency(entry.average),
              highest: formatCurrency(entry.highest),
              lowest: formatCurrency(entry.lowest),
            },
        unchangedNote: isUnchanged
          ? `${formatCurrency(entry.average)} every period — unchanged.`
          : null,
        // Suppressed when unchanged: a category whose contributing periods are all equal has a
        // delta of exactly 0 by construction, so the badge would restate `unchangedNote` as a
        // percentage — which is the "0%" the UX review read as a broken figure (TICKET-STAT-44).
        deltaLabel:
          isUnchanged || entry.deltaVsAveragePct == null
            ? null
            : formatPercent(entry.deltaVsAveragePct, 'sign-by-icon'),
        deltaColor: !hasDelta ? undefined : isOverAverage ? 'warning' : 'success',
        deltaIcon: !hasDelta
          ? undefined
          : isOverAverage
            ? 'tablerTriangleFill'
            : 'tablerTriangleInvertedFill',
      };
    });
  });

  protected readonly excludedCategoryIds = computed(
    () => new Set(this.categoryComparisonSettingsStore.excludedCategoryIds()),
  );

  protected setExcludedCategoryIds(excludedCategoryIds: number[]): void {
    void this.categoryComparisonSettingsStore.setExcludedCategoryIds(excludedCategoryIds);
  }
}
