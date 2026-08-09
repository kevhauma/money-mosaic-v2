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
import { categoryOverlapsRange, withEndedSuffix } from '@/core/categorisation';
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
  hasActiveFiltersSignal,
  structuralFiltersSignal,
} from '@/shared/utils';
import {
  AMOUNT_DIRECTION_OPTIONS,
  DEFAULT_AMOUNT_DIRECTION,
  filtersToRuleConditions,
  type AmountDirection,
  type TransactionFilters,
} from '../../transaction-filters';
import type { CategorySelectOption } from '../../category-picker';

/** The filter fields that apply immediately, i.e. everything except the debounced free-text needle (CR-2.4). */
type StructuralFilters = Omit<TransactionFilters, 'text'>;

const todayIso = (): string => new Date().toISOString().slice(0, 10);

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
    amountDirection: value.amountDirection ?? DEFAULT_AMOUNT_DIRECTION,
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
  private readonly categoriesStore = inject(CategoriesStore);

  private readonly formBuilder = inject(FormBuilder);

  /** Drill-down inheritance (FR-STAT-6): forwarded down from the route entry component. */
  readonly accountId = input<string>();
  readonly from = input<string>();
  readonly to = input<string>();
  readonly categoryId = input<string>();

  /** Emits the combined filter set whenever a structural field changes or the text needle settles. */
  readonly filtersChange = output<TransactionFilters>();

  /** "Make rule from filter" (TICKET-CAT-07) — parent owns the rule-form modal/store, this just signals intent. */
  readonly makeRuleFromFilter = output<void>();

  protected readonly filterForm = this.formBuilder.nonNullable.group({
    accountId: [''],
    dateFrom: [''],
    dateTo: [''],
    categoryId: [''],
    text: [''],
    amountMin: [''],
    amountMax: [''],
    amountDirection:
      this.formBuilder.nonNullable.control<AmountDirection>(DEFAULT_AMOUNT_DIRECTION),
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
   * The shared scan, with no axis excluded (TICKET-TXN-10): `amountDirection`'s off position is
   * `'all'` rather than `''`, so it is declared as this form's one non-empty default and otherwise
   * counts exactly like every other axis — picking Income with nothing else set enables "Clear".
   */
  protected readonly hasActiveFilters = hasActiveFiltersSignal(
    this.structuralFilters,
    this.debouncedText,
    { amountDirection: DEFAULT_AMOUNT_DIRECTION },
  );

  protected readonly amountDirection = computed(() => this.structuralFilters().amountDirection);

  /**
   * The categories worth filtering by, given the range already being filtered (TICKET-CAT-11):
   * those whose applicability window overlaps it. With **no** date filter set the list is complete —
   * the whole history is on the table, and a category that ended in 2023 is exactly what someone
   * looking back at 2023 needs to pick.
   *
   * A half-open range counts: `dateFrom` alone means "everything since", so the far bound is left
   * unbounded rather than defaulting to today, which would hide a category whose window has not
   * started yet from a filter that would still match its future rows.
   */
  protected readonly categoryOptions = computed<CategorySelectOption[]>(() => {
    const { dateFrom, dateTo, categoryId } = this.structuralFilters();
    const categories = this.categoriesStore.activeCategories();
    const today = todayIso();

    const inRange =
      dateFrom || dateTo
        ? categories.filter((category) =>
            categoryOverlapsRange(category, dateFrom || '0000-01-01', dateTo || '9999-12-31'),
          )
        : categories;

    // A `<select>` whose value is not among its options is a broken control: narrowing the range
    // must never silently drop the selection that produced the rows on screen.
    const selected = categories.find((category) => String(category.id) === categoryId);
    const options = selected && !inRange.includes(selected) ? [...inRange, selected] : inRange;

    return options.map((category) => ({
      value: String(category.id),
      label: withEndedSuffix(category.name, category, today),
    }));
  });

  protected readonly amountDirections = AMOUNT_DIRECTION_OPTIONS;

  /** Enabled only when at least one *convertible* axis is set — a date/category-only filter has nothing to turn into a rule (TICKET-CAT-07). */
  protected readonly canMakeRuleFromFilter = computed(
    () => filtersToRuleConditions(this.filterKey()).length > 0,
  );

  /**
   * The disabled button's tooltip, or `null` while it is enabled — resolved here rather than with a
   * ternary in the binding, per the "templates branch on state, they never derive it" convention.
   * Names Income/Expenses explicitly (TICKET-TXN-10): an amount bound under "All" is an either-sign
   * match, which no rule condition can express, so a bound alone no longer enables the button.
   */
  protected readonly makeRuleHint = computed(() =>
    this.canMakeRuleFromFilter()
      ? null
      : 'Set a text, account, or Income/Expenses amount filter first',
  );

  protected onDateRangeChange(range: DateRangeValue): void {
    this.filterForm.patchValue({ dateFrom: range.from, dateTo: range.to });
  }

  protected setAmountDirection(direction: AmountDirection): void {
    this.filterForm.patchValue({ amountDirection: direction });
  }

  protected onMakeRuleFromFilter(): void {
    this.makeRuleFromFilter.emit();
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
      amountDirection: DEFAULT_AMOUNT_DIRECTION,
    });
  }
}
