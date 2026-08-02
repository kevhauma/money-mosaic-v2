import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
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
import { IncomeGrossColorComponent } from '../income-gross-color/income-gross-color.component';
import { IncomeMainCategoryComponent } from '../income-main-category/income-main-category.component';

/**
 * The Income page's settings, as their own route (`/income/settings`, TICKET-INC-18) rather than the
 * 320px dropdown TICKET-INC-04 consolidated them into.
 *
 * That consolidation isn't reversed — this is still *one* entry point for every choice that
 * re-anchors what the page means: where the user's career started (FR-INC-12), which income
 * categories count toward growth (FR-INC-3), which of those are an annual lump sum (FR-INC-4), and
 * what colour gross pay is drawn in (TICKET-SET-08). What changes is that a page has room to
 * *explain* each one, which a panel sized for a control list never did — and these are the settings
 * that most need explaining, since each silently changes every figure on the page.
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

  /**
   * Set by the first-visit intro's hand-off (TICKET-PUB-08). A query param rather than a persisted
   * "onboarding in progress" flag: the state lives for exactly one navigation, so a param is honest
   * about its lifetime and needs no cleanup — a user who bookmarks the URL sees one extra banner,
   * which is harmless. Resolved here at the routing layer and read nowhere else.
   */
  readonly from = input<string>();

  protected readonly arrivedFromSetup = computed(() => this.from() === 'setup');

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
  protected readonly smoothableCategories = computed<SelectableIncomeCategoryVm[]>(() =>
    toSelectableIncomeCategories(
      this.incomeStore.countedIncomeCategories(),
      this.incomeStore.smoothedBonusCategoryIds(),
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

  protected toggleSmoothed(categoryId: number): void {
    void this.incomeStore.toggleSmoothedBonusCategory(categoryId);
  }
}
