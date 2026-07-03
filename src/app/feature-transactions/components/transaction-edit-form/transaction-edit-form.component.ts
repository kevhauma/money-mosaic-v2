import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  computed,
  effect,
  inject,
  input,
  model,
  output,
  viewChild,
} from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import type { Category, Transaction } from '@/core/data-access';
import { CategoriesStore, RulesStore } from '@/feature-categories';
import { ButtonComponent, SelectComponent } from '@/shared/ui';

export type TransactionEditResult = Partial<
  Pick<Transaction, 'categoryId' | 'categoryManual' | 'notes'>
>;

@Component({
  selector: 'app-transaction-edit-form',
  imports: [ReactiveFormsModule, ButtonComponent, SelectComponent],
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
  private readonly dialog = viewChild.required<ElementRef<HTMLDialogElement>>('dialog');

  protected readonly form = this.formBuilder.nonNullable.group({
    categoryId: [''],
    notes: [''],
    alwaysCategorise: [false],
  });

  constructor() {
    effect(() => {
      const dialogElement = this.dialog().nativeElement;
      if (this.open()) {
        this.resetForm();
        dialogElement.showModal?.();
      } else {
        dialogElement.close?.();
      }
    });
  }

  protected categoryLabel(category: Category): string {
    return category.group ? `${category.group} · ${category.name}` : category.name;
  }

  protected readonly showAlwaysCategorise = computed(() => !!this.transaction()?.counterpartyName);

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
