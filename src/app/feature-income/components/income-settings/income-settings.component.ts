import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { ButtonComponent, DividerComponent, DropdownComponent } from '@/shared/ui';
import {
  toSelectableIncomeCategories,
  type SelectableIncomeCategoryVm,
} from '../../income-category-vm';
import { IncomeStore } from '../../income.store';
import { IncomeCareerStartComponent } from '../income-career-start/income-career-start.component';
import { IncomeCategoryChecklistComponent } from '../income-category-checklist/income-category-checklist.component';
import { IncomeGrossColorComponent } from '../income-gross-color/income-gross-color.component';

/**
 * The Income page's single settings entry point (TICKET-INC-04): one popover in the page header
 * holding every choice that re-anchors what the page means — where the user's career started
 * (FR-INC-12), which income categories count toward growth (FR-INC-3), which of those are an
 * annual lump sum to smooth across their year (FR-INC-4), and the colour its gross-pay series are
 * drawn in (TICKET-SET-08).
 *
 * Consolidated rather than scattered because all three change *every* panel at once: before this,
 * the career-start control sat bare in the header and the category filter beside the trend chart,
 * which read as "this control belongs to that chart" for a setting the yearly panel obeys too.
 *
 * `menu="false"` — the panel is a form, not a list of menu items, and a `<ul><li>` wrapper around a
 * date field and two fieldsets would be markup lying about its content.
 */
@Component({
  selector: 'app-income-settings',
  imports: [
    ButtonComponent,
    DividerComponent,
    DropdownComponent,
    IncomeCareerStartComponent,
    IncomeCategoryChecklistComponent,
    IncomeGrossColorComponent,
  ],
  templateUrl: './income-settings.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class IncomeSettingsComponent {
  private readonly incomeStore = inject(IncomeStore);

  /** Every active income category, ticked when it counts toward growth (FR-INC-3). */
  protected readonly countedCategories = computed<SelectableIncomeCategoryVm[]>(() =>
    toSelectableIncomeCategories(
      this.incomeStore.incomeCategories(),
      this.incomeStore.selectedIncomeCategoryIds(),
    ),
  );

  /**
   * Only the categories that currently count toward growth (FR-INC-4): smoothing changes how a
   * category is *drawn*, so offering it for one the user has already excluded would be a setting
   * with nothing to act on.
   */
  protected readonly smoothableCategories = computed<SelectableIncomeCategoryVm[]>(() => {
    const selected = this.incomeStore.selectedIncomeCategoryIds();
    return toSelectableIncomeCategories(
      this.incomeStore.incomeCategories().filter((category) => selected.has(category.id!)),
      this.incomeStore.smoothedBonusCategoryIds(),
    );
  });

  /** `counted/total` on the trigger, so the popup says whether anything is filtered without being opened. */
  protected readonly summary = computed(() => {
    const categories = this.countedCategories();
    return `${categories.filter((category) => category.checked).length}/${categories.length}`;
  });

  protected toggleCounted(categoryId: number): void {
    void this.incomeStore.toggleIncomeCategory(categoryId);
  }

  protected toggleSmoothed(categoryId: number): void {
    void this.incomeStore.toggleSmoothedBonusCategory(categoryId);
  }
}
