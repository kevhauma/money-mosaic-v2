import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  input,
  model,
  output,
} from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import type { Category, Transaction } from '@/core/data-access';
import { CategoriesStore, RulesStore } from '@/feature-categories';
import { ButtonComponent, MmModalComponent, SelectComponent } from '@/shared/ui';

export type TransactionEditResult = Partial<
  Pick<Transaction, 'categoryId' | 'categoryManual' | 'notes'>
>;

@Component({
  selector: 'app-transaction-edit-form',
  imports: [ReactiveFormsModule, ButtonComponent, SelectComponent, MmModalComponent],
  templateUrl: './transaction-edit-form.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TransactionEditFormComponent {
  readonly open = model(false);
  readonly transaction = input<Transaction | null>(null);
  readonly saved = output<TransactionEditResult>();

  protected readonly categoriesStore = inject(CategoriesStore);
  private readonly rulesStore = inject(RulesStore);

  private readonly formBuilder = inject(FormBuilder);

  protected readonly form = this.formBuilder.nonNullable.group({
    categoryId: [''],
    notes: [''],
    alwaysCategorise: [false],
  });

  constructor() {
    effect(() => {
      if (this.open()) {
        this.resetForm();
      }
    });
  }

  protected categoryLabel(category: Category): string {
    return category.group ? `${category.group} · ${category.name}` : category.name;
  }

  protected readonly showAlwaysCategorise = computed(() => !!this.transaction()?.counterpartyName);

  /** Header→value pairs, in original column order, for the "Original CSV row" table (TICKET-TXN-06). */
  protected readonly rawRowEntries = computed(() => {
    const rawRow = this.transaction()?.rawRow;
    return rawRow ? Object.entries(rawRow) : [];
  });

  private resetForm(): void {
    const existing = this.transaction();
    this.form.reset({
      categoryId: existing?.categoryId != null ? String(existing.categoryId) : '',
      notes: existing?.notes ?? '',
      alwaysCategorise: false,
    });
  }

  protected async submit(): Promise<void> {
    const existing = this.transaction();
    if (!existing) {
      return;
    }

    const value = this.form.getRawValue();
    const categoryId = value.categoryId ? Number(value.categoryId) : undefined;
    const notes = value.notes.trim() || undefined;

    const result: TransactionEditResult = { notes };
    if (categoryId !== existing.categoryId) {
      result.categoryId = categoryId;
      result.categoryManual = true;
    }

    this.saved.emit(result);
    this.open.set(false);

    if (value.alwaysCategorise && categoryId != null) {
      await this.rulesStore.createRuleFromCounterparty(existing, categoryId);
    }
  }

  protected cancel(): void {
    this.open.set(false);
  }
}
