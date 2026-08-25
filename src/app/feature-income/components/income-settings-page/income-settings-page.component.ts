import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import {
  AlertComponent,
  ButtonComponent,
  PageHeaderComponent,
  PaperComponent,
  TypographyComponent,
} from '@/shared/ui';
import {
  toSelectableIncomeCategories,
  type SelectableIncomeCategoryVm,
} from '../../income-category-vm';
import { IncomeStore } from '../../income.store';
import { IncomeCareerStartComponent } from '../income-career-start/income-career-start.component';
import { IncomeCategoryChecklistComponent } from '../income-category-checklist/income-category-checklist.component';
import { IncomeLumpSumChecklistComponent } from '../income-lump-sum-checklist/income-lump-sum-checklist.component';
import { IncomeGrossColorComponent } from '../income-gross-color/income-gross-color.component';
import { IncomeMainCategoryComponent } from '../income-main-category/income-main-category.component';

/**
 * The Income page's settings, as their own route (`/income/settings`, TICKET-INC-18) rather than the
 * 320px dropdown TICKET-INC-04 consolidated them into.
 *
 * That consolidation isn't reversed — this is still the one page that gathers every choice which
 * re-anchors what the Income page means: where the user's career started (FR-INC-12), which income
 * categories count toward growth (FR-INC-3), which of those are an annual lump sum (FR-INC-4), and
 * what colour gross pay is drawn in (TICKET-SET-08). What changes is that a page has room to
 * *explain* each one, which a panel sized for a control list never did — and these are the settings
 * that most need explaining, since each silently changes every figure on the page.
 *
 * It is no longer the *only* place three of them can be reached (TICKET-INC-23): career start, the
 * lump-sum list and the main income category are also offered beside the figure each one produces,
 * through `app-income-inference-note`. Both surfaces render the same store-bound control, so there
 * is one of each — this page is where they are explained at length, not where they exclusively live.
 *
 * Being a route also makes them linkable, reloadable and reachable with the back button, which the
 * dropdown never was.
 */
@Component({
  selector: 'app-income-settings-page',
  imports: [
    AlertComponent,
    ButtonComponent,
    IncomeCareerStartComponent,
    IncomeCategoryChecklistComponent,
    IncomeLumpSumChecklistComponent,
    IncomeGrossColorComponent,
    IncomeMainCategoryComponent,
    PageHeaderComponent,
    PaperComponent,
    TypographyComponent,
  ],
  templateUrl: './income-settings-page.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class IncomeSettingsPageComponent {
  private readonly incomeStore = inject(IncomeStore);

  /** Every active income category, ticked when it counts toward growth (FR-INC-3). */
  protected readonly countedCategories = computed<SelectableIncomeCategoryVm[]>(() =>
    toSelectableIncomeCategories(
      this.incomeStore.incomeCategories(),
      this.incomeStore.selectedIncomeCategoryIds(),
    ),
  );

  /** `counted/total`, so the page says at a glance whether anything is filtered out. */
  protected readonly summary = computed(() => {
    const categories = this.countedCategories();
    return `${categories.filter((category) => category.checked).length}/${categories.length}`;
  });

  protected toggleCounted(categoryId: number): void {
    void this.incomeStore.toggleIncomeCategory(categoryId);
  }
}
