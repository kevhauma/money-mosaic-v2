import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  input,
  output,
} from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { toSignal } from '@angular/core/rxjs-interop';
import { distinctUntilChanged, map } from 'rxjs';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { tablerFilterOff } from '@ng-icons/tabler-icons';
import { AccountsStore } from '@/feature-accounts';
import { CategoriesStore } from '@/feature-categories';
import { ButtonComponent, InputComponent, SelectComponent } from '@/shared/ui';
import { debouncedTextSignal } from '@/shared/utils';
import type { TransactionFilters } from '../../transaction-filters';

/** The filter fields that apply immediately, i.e. everything except the debounced free-text needle (CR-2.4). */
type StructuralFilters = Omit<TransactionFilters, 'text'>;

/**
 * Drops the free-text field so structural filters can be compared/emitted independently of debounced
 * text (CR-2.4). Takes `Partial<TransactionFilters>` because `FormGroup.valueChanges` is typed as
 * partial even for a `nonNullable` group — a disabled control can drop out of the emitted value.
 */
function structuralFiltersOf(value: Partial<TransactionFilters>): StructuralFilters {
  return {
    accountId: value.accountId ?? '',
    dateFrom: value.dateFrom ?? '',
    dateTo: value.dateTo ?? '',
    categoryId: value.categoryId ?? '',
    amountMin: value.amountMin ?? '',
    amountMax: value.amountMax ?? '',
  };
}

@Component({
  selector: 'app-transaction-filters',
  imports: [ReactiveFormsModule, NgIcon, ButtonComponent, InputComponent, SelectComponent],
  templateUrl: './transaction-filters.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  viewProviders: [provideIcons({ tablerFilterOff })],
})
export class TransactionFiltersComponent {
  protected readonly accountsStore = inject(AccountsStore);
  protected readonly categoriesStore = inject(CategoriesStore);

  private readonly formBuilder = inject(FormBuilder);

  /** Drill-down inheritance (FR-STAT-6): forwarded down from the route entry component. */
  readonly accountId = input<string>();
  readonly from = input<string>();
  readonly to = input<string>();
  readonly categoryId = input<string>();

  /** Emits the combined filter set whenever a structural field changes or the text needle settles. */
  readonly filtersChange = output<TransactionFilters>();

  protected readonly filterForm = this.formBuilder.nonNullable.group({
    accountId: [''],
    dateFrom: [''],
    dateTo: [''],
    categoryId: [''],
    text: [''],
    amountMin: [''],
    amountMax: [''],
  });

  constructor() {
    // Re-seeds the URL-backed filters whenever a drill-down navigates to this same-route
    // instance with new query params (FR-STAT-6) — free-text/amount stay untouched (CR-2.4).
    effect(() => {
      this.filterForm.patchValue({
        accountId: this.accountId() ?? '',
        dateFrom: this.from() ?? '',
        dateTo: this.to() ?? '',
        categoryId: this.categoryId() ?? '',
      });
    });

    effect(() => {
      this.filtersChange.emit(this.filterKey());
    });
  }

  /** Structural filters apply immediately; `distinctUntilChanged` keeps text keystrokes from re-emitting them. */
  private readonly structuralFilters = toSignal(
    this.filterForm.valueChanges.pipe(
      map(structuralFiltersOf),
      distinctUntilChanged(
        (a, b) =>
          a.accountId === b.accountId &&
          a.dateFrom === b.dateFrom &&
          a.dateTo === b.dateTo &&
          a.categoryId === b.categoryId &&
          a.amountMin === b.amountMin &&
          a.amountMax === b.amountMax,
      ),
    ),
    { initialValue: structuralFiltersOf(this.filterForm.getRawValue()) },
  );

  /** Free-text needle, debounced so typing doesn't re-run the filter/render pipeline on every keystroke (CR-2.4). */
  private readonly debouncedText = debouncedTextSignal(this.filterForm.controls.text);

  /** Single key that changes on either a structural change or a settled text change. */
  private readonly filterKey = computed<TransactionFilters>(() => ({
    ...this.structuralFilters(),
    text: this.debouncedText(),
  }));

  protected readonly hasActiveFilters = computed(
    () =>
      this.debouncedText() !== '' ||
      Object.values(this.structuralFilters()).some((value) => value !== ''),
  );

  /** Called by the parent (e.g. the "still need a category" banner) to jump straight to the uncategorised filter. */
  showUncategorisedOnly(): void {
    this.filterForm.patchValue({ categoryId: 'uncategorised' });
  }

  protected clearFilters(): void {
    this.filterForm.reset({
      accountId: '',
      dateFrom: '',
      dateTo: '',
      categoryId: '',
      text: '',
      amountMin: '',
      amountMax: '',
    });
  }
}
