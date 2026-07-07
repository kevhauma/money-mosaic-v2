import { ChangeDetectionStrategy, Component, inject, input, output } from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { tablerTag, tablerX } from '@ng-icons/tabler-icons';
import { CategoriesStore } from '@/feature-categories';
import { ButtonComponent, SelectComponent } from '@/shared/ui';

@Component({
  selector: 'app-transaction-bulk-bar',
  imports: [ReactiveFormsModule, NgIcon, ButtonComponent, SelectComponent],
  templateUrl: './transaction-bulk-bar.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  viewProviders: [provideIcons({ tablerTag, tablerX })],
})
export class TransactionBulkBarComponent {
  protected readonly categoriesStore = inject(CategoriesStore);

  /** Rows currently selected, and the size of the filtered set "Select all" would grow the selection to. */
  readonly count = input.required<number>();
  readonly filteredCount = input.required<number>();

  readonly applyCategory = output<number>();
  readonly selectAllRequested = output<void>();
  readonly clearRequested = output<void>();

  protected readonly categoryControl = inject(FormBuilder).nonNullable.control('');

  protected apply(): void {
    const rawCategoryId = this.categoryControl.value;
    if (rawCategoryId === '') return;
    this.applyCategory.emit(Number(rawCategoryId));
    this.categoryControl.setValue('');
  }
}
