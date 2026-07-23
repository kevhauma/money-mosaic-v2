import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  input,
  output,
  type Signal,
} from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { toSignal } from '@angular/core/rxjs-interop';
import { distinctUntilChanged, map } from 'rxjs';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { tablerFilterOff } from '@ng-icons/tabler-icons';
import { AccountsStore, CategoriesStore } from '@/core/state';
import {
  ButtonComponent,
  DateRangeInputComponent,
  FieldsetComponent,
  FlexComponent,
  InputComponent,
  PaperComponent,
  SelectComponent,
  type DateRangeValue,
} from '@/shared/ui';
import {
  combinedFiltersSignal,
  debouncedTextSignal,
  structuralFiltersSignal,
} from '@/shared/utils';
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
    amountDirection: value.amountDirection ?? 'expense',
  };
}

@Component({
  selector: 'app-transaction-filters',
  imports: [
    ReactiveFormsModule,
    NgIcon,
    ButtonComponent,
    DateRangeInputComponent,
    FieldsetComponent,
    FlexComponent,
    InputComponent,
    PaperComponent,
    SelectComponent,
  ],
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
    amountDirection: this.formBuilder.nonNullable.control<'expense' | 'income'>('expense'),
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

  /** Structural filters apply immediately; text keystrokes never re-emit them (CR-2.4, CR3-2.5). */
  private readonly structuralFilters = structuralFiltersSignal(
    this.filterForm.valueChanges,
    structuralFiltersOf,
    this.filterForm.getRawValue(),
  );

  /** Free-text needle, debounced so typing doesn't re-run the filter/render pipeline on every keystroke (CR-2.4). */
  private readonly debouncedText = debouncedTextSignal(this.filterForm.controls.text);

  /** Bridges the `dateFrom`/`dateTo` form controls to the single `mm-date-range-input` value, same toSignal pattern as `structuralFilters`. */
  protected readonly dateRangeValue = toSignal(
    this.filterForm.valueChanges.pipe(
      map((value): DateRangeValue => ({ from: value.dateFrom ?? '', to: value.dateTo ?? '' })),
      distinctUntilChanged((a, b) => a.from === b.from && a.to === b.to),
    ),
    {
      initialValue: {
        from: this.filterForm.getRawValue().dateFrom,
        to: this.filterForm.getRawValue().dateTo,
      },
    },
  );

  /** Single key that changes on either a structural change or a settled text change. */
  private readonly filterKey: Signal<TransactionFilters> = combinedFiltersSignal(
    this.structuralFilters,
    this.debouncedText,
  );

  /**
   * Component-local override of the shared `hasActiveFiltersSignal` scan: `amountDirection` is
   * always populated ('expense' by default), so the generic "any field non-empty" check would
   * otherwise treat it as a permanently active filter. It only counts as active alongside a
   * non-empty `amountMin`/`amountMax` (TICKET-TXN-08).
   */
  protected readonly hasActiveFilters = computed(() => {
    const structural = this.structuralFilters();
    const structuralActive = Object.entries(structural).some(
      ([key, value]) => key !== 'amountDirection' && value !== '',
    );
    return this.debouncedText() !== '' || structuralActive;
  });

  protected readonly amountDirection = computed(() => this.structuralFilters().amountDirection);

  protected onDateRangeChange(range: DateRangeValue): void {
    this.filterForm.patchValue({ dateFrom: range.from, dateTo: range.to });
  }

  protected setAmountDirection(direction: 'expense' | 'income'): void {
    this.filterForm.patchValue({ amountDirection: direction });
  }

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
      amountDirection: 'expense',
    });
  }
}
