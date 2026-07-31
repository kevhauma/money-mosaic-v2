import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import {
  BadgeComponent,
  ButtonComponent,
  DropdownComponent,
  LabelComponent,
  TypographyComponent,
} from '@/shared/ui';
import { IncomeStore } from '../../income.store';

/** One row in the "income categories" checklist. */
type SelectableIncomeCategoryVm = {
  id: number;
  name: string;
  /** Pre-assembled so the template only reads a field — the category colour is a stored hex, not a theme token, so it can only reach the swatch as an inline style. */
  swatchStyle: string;
  selected: boolean;
};

/**
 * Lets the user choose which income categories count toward "my income growth" (FR-INC-3,
 * TICKET-INC-03), so a noisy one-off gift/refund category doesn't distort the trend without their
 * say-so. Every FR-INC aggregate on this page reads the same
 * `IncomeStore.selectedIncomeCategoryIds()`, so the choice means the same thing across the whole
 * page. Deliberately the same `mm-dropdown` + `mm-label as="label"` + native checkbox shape as the
 * dashboard's category-exclusion control (`category-comparison-panel`) rather than a second picker
 * pattern; the selection is persisted, so it survives a reload.
 */
@Component({
  selector: 'app-income-category-filter',
  imports: [
    BadgeComponent,
    ButtonComponent,
    DropdownComponent,
    LabelComponent,
    TypographyComponent,
  ],
  templateUrl: './income-category-filter.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class IncomeCategoryFilterComponent {
  private readonly incomeStore = inject(IncomeStore);

  protected readonly categories = computed<SelectableIncomeCategoryVm[]>(() => {
    const selected = this.incomeStore.selectedIncomeCategoryIds();
    return this.incomeStore.incomeCategories().map((category) => ({
      id: category.id!,
      name: category.name,
      swatchStyle: `background-color: ${category.color}; border-color: ${category.color}`,
      selected: selected.has(category.id!),
    }));
  });

  protected readonly selectedCount = computed(
    () => this.categories().filter((category) => category.selected).length,
  );

  protected readonly summary = computed(
    () => `${this.selectedCount()}/${this.categories().length}`,
  );

  protected toggle(categoryId: number): void {
    void this.incomeStore.toggleIncomeCategory(categoryId);
  }
}
