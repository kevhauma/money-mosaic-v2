import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { tablerLink, tablerTag, tablerTrash, tablerX } from '@ng-icons/tabler-icons';
import { categoryOverlapsRange } from '@/core/categorisation';
import { CategoriesStore } from '@/core/state';
import {
  ButtonComponent,
  ConfirmDialogComponent,
  FlexComponent,
  PaperComponent,
  SelectComponent,
  TypographyComponent,
} from '@/shared/ui';
import type { BookingDateSpan, CategorySelectOption } from '../../category-picker';

@Component({
  selector: 'app-transaction-bulk-bar',
  imports: [
    ReactiveFormsModule,
    NgIcon,
    ButtonComponent,
    ConfirmDialogComponent,
    FlexComponent,
    PaperComponent,
    SelectComponent,
    TypographyComponent,
  ],
  templateUrl: './transaction-bulk-bar.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  viewProviders: [provideIcons({ tablerLink, tablerTag, tablerTrash, tablerX })],
})
export class TransactionBulkBarComponent {
  private readonly categoriesStore = inject(CategoriesStore);

  /** Rows currently selected, and the size of the filtered set "Select all" would grow the selection to. */
  readonly count = input.required<number>();
  readonly filteredCount = input.required<number>();
  /** True when exactly two rows are selected, the only shape that can be linked as a transfer. */
  readonly canLink = input(false);
  /** Booking dates the selection covers, which the category picker is filtered against (TICKET-CAT-11). */
  readonly selectedDateSpan = input<BookingDateSpan | null>(null);

  /**
   * The categories assignable to the whole selection (TICKET-CAT-11) — those whose applicability
   * window overlaps the selected rows' span, so a bulk-assign never offers a category that applies
   * to none of the rows it would be written to.
   *
   * No "(ended)" escape hatch here, unlike the pickers that show a current value: this control has
   * no current value to preserve — it is an action list, and an option nobody can be assigned is
   * simply not one.
   */
  protected readonly categoryOptions = computed<CategorySelectOption[]>(() => {
    const span = this.selectedDateSpan();
    const categories = this.categoriesStore.activeCategories();
    const offerable = span
      ? categories.filter((category) => categoryOverlapsRange(category, span.from, span.to))
      : categories;

    return offerable.map((category) => ({ value: String(category.id), label: category.name }));
  });

  readonly applyCategory = output<number>();
  readonly linkRequested = output<void>();
  readonly selectAllRequested = output<void>();
  readonly clearRequested = output<void>();
  readonly deleteRequested = output<void>();

  protected readonly categoryControl = inject(FormBuilder).nonNullable.control('');
  protected readonly deleteConfirmOpen = signal(false);

  protected apply(): void {
    const rawCategoryId = this.categoryControl.value;
    if (rawCategoryId === '') return;
    this.applyCategory.emit(Number(rawCategoryId));
    this.categoryControl.setValue('');
  }

  protected confirmDelete(): void {
    this.deleteConfirmOpen.set(true);
  }

  protected deleteConfirmed(): void {
    this.deleteRequested.emit();
  }
}
