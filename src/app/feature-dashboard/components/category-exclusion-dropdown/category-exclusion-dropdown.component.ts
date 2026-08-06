import { ChangeDetectionStrategy, Component, computed, inject, input, output } from '@angular/core';
import { CategoriesStore } from '@/core/state';
import {
  ButtonComponent,
  DropdownComponent,
  LabelComponent,
  TypographyComponent,
} from '@/shared/ui';

/** One row in the checklist. */
type ExcludableCategoryVm = { id: number; name: string; excluded: boolean };

/**
 * "Exclude categories" checklist for a Dashboard panel — the control the category period
 * comparison panel introduced (TICKET-STAT-04) and the spending heatmap adopted
 * (TICKET-STAT-32), extracted here on that second use rather than copied a second time.
 *
 * It owns the checklist and the toggle arithmetic; it deliberately does **not** own the
 * persistence, because each panel keeps its own exclusion list (what isn't worth comparing
 * period-over-period and what drowns out a heatmap are different judgements). The caller passes
 * the current set and persists the next one through its own store.
 */
@Component({
  selector: 'app-category-exclusion-dropdown',
  imports: [ButtonComponent, DropdownComponent, LabelComponent, TypographyComponent],
  templateUrl: './category-exclusion-dropdown.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CategoryExclusionDropdownComponent {
  readonly excludedIds = input.required<ReadonlySet<number>>();

  /** The full next set, ready to hand straight to a store setter. */
  readonly excludedChange = output<number[]>();

  private readonly categoriesStore = inject(CategoriesStore);

  /** Active expense categories only: an income category has nothing to contribute to a spending panel, and an archived one shouldn't reappear in a checklist. */
  protected readonly categories = computed<ExcludableCategoryVm[]>(() => {
    const excluded = this.excludedIds();
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
    () => this.categories().filter((category) => category.excluded).length,
  );

  /** Nothing to exclude means no control at all, rather than an empty menu. */
  protected readonly hasCategories = computed(() => this.categories().length > 0);

  protected toggle(categoryId: number, excluded: boolean): void {
    const next = new Set(this.excludedIds());
    if (excluded) next.add(categoryId);
    else next.delete(categoryId);
    this.excludedChange.emit([...next]);
  }
}
