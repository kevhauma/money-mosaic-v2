import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import {
  toSelectableIncomeCategories,
  type SelectableIncomeCategoryVm,
} from '../../income-category-vm';
import { IncomeStore } from '../../income.store';
import { IncomeCategoryChecklistComponent } from '../income-category-checklist/income-category-checklist.component';

/**
 * Which income categories pay out once a year rather than monthly (FR-INC-4), as a store-bound
 * control — the same shape `app-income-main-category` and `app-income-career-start` have, and for
 * the same reason (TICKET-INC-23).
 *
 * `app-income-category-checklist` is deliberately presentational: its caller owns the rows and
 * reacts to `toggled`. That was fine while `/income/settings` was the only caller; with the trend
 * chart now offering the same setting beside the chart it shapes, having two callers repeat the
 * rows, the toggle and the three strings would mean editing one setting in two files.
 *
 * Offers only the categories that currently **count** toward growth: smoothing changes how a
 * category is *drawn*, so a category the user has already excluded has nothing to act on.
 */
@Component({
  selector: 'app-income-lump-sum-checklist',
  imports: [IncomeCategoryChecklistComponent],
  templateUrl: './income-lump-sum-checklist.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class IncomeLumpSumChecklistComponent {
  private readonly incomeStore = inject(IncomeStore);

  protected readonly categories = computed<SelectableIncomeCategoryVm[]>(() =>
    toSelectableIncomeCategories(
      this.incomeStore.countedIncomeCategories(),
      this.incomeStore.smoothedBonusCategoryIds(),
    ),
  );

  protected toggle(categoryId: number): void {
    void this.incomeStore.toggleSmoothedBonusCategory(categoryId);
  }
}
