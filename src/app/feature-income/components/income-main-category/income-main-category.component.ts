import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import {
  BadgeComponent,
  FieldsetComponent,
  LabelComponent,
  TypographyComponent,
} from '@/shared/ui';
import {
  toSelectableIncomeCategories,
  type SelectableIncomeCategoryVm,
} from '../../income-category-vm';
import { IncomeStore } from '../../income.store';

/**
 * Names the income category the user's salary actually lands in (TICKET-INC-19), so a bonus recorded
 * on a month's salary details (FR-INC-10) is taken off *that* category instead of being shaved off
 * every income stream that was non-zero that month.
 *
 * Offers only the categories that **count toward growth** (FR-INC-3), on the same reasoning as the
 * annual-lump-sum checklist beside it: a category the user has already excluded has no series for a
 * bonus to be subtracted from. `IncomeStore.toggleIncomeCategory` clears the setting if the chosen
 * category later leaves that selection, so this list can never be missing its own selected row.
 *
 * Radios rather than the neighbouring checklists' checkboxes because this is genuinely one choice,
 * and "no main category" is a real option rather than the absence of one — it is the default, and it
 * reproduces the pro-rata split the page did before this setting existed.
 */
@Component({
  selector: 'app-income-main-category',
  imports: [BadgeComponent, FieldsetComponent, LabelComponent, TypographyComponent],
  templateUrl: './income-main-category.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class IncomeMainCategoryComponent {
  private readonly incomeStore = inject(IncomeStore);

  /** The counted income categories, with the stored main one marked — the same row shape both checklists use. */
  protected readonly categories = computed<SelectableIncomeCategoryVm[]>(() => {
    const mainId = this.incomeStore.mainIncomeCategoryId();
    return toSelectableIncomeCategories(
      this.incomeStore.countedIncomeCategories(),
      mainId === undefined ? new Set() : new Set([mainId]),
    );
  });

  protected readonly isSplitProportionally = computed(
    () => this.incomeStore.mainIncomeCategoryId() === undefined,
  );

  protected select(categoryId: number | undefined): void {
    void this.incomeStore.setMainIncomeCategoryId(categoryId);
  }
}
