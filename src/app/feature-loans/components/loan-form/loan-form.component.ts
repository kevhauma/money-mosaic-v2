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
import {
  FormBuilder,
  ReactiveFormsModule,
  Validators,
  type AbstractControl,
  type FormControl,
  type FormGroup,
  type ValidationErrors,
  type ValidatorFn,
} from '@angular/forms';
import type { Loan } from '@/core/data-access';
import { CategoriesStore } from '@/core/state';
import {
  ButtonComponent,
  FieldsetComponent,
  InputComponent,
  LabelComponent,
  MmModalComponent,
  SelectComponent,
} from '@/shared/ui';
import { percentageValidator } from '@/shared/utils/validators/percentage.validator';
import { LOAN_TYPE_OPTIONS } from '../../loan-types';

export type LoanFormValue = Omit<Loan, 'id' | 'archived' | 'sortOrder'>;

const today = (): string => new Date().toISOString().slice(0, 10);

/** A name of only spaces is an empty name, the `GoalFormComponent` precedent. */
const nonBlankValidator = (control: AbstractControl): ValidationErrors | null =>
  (control.value as string).trim() ? null : { blank: true };

/** A loan's original principal is a positive amount — zero or negative has no schedule to amortize. */
const positiveAmountValidator = (control: AbstractControl): ValidationErrors | null => {
  const value = Number(control.value);
  return Number.isFinite(value) && value > 0 ? null : { positiveAmount: true };
};

/** A term is a whole number of months greater than zero. */
const positiveIntegerValidator = (control: AbstractControl): ValidationErrors | null => {
  const value = Number(control.value);
  return Number.isFinite(value) && Number.isInteger(value) && value > 0
    ? null
    : { positiveInteger: true };
};

type LoanFormGroup = FormGroup<{
  categoryId: FormControl<string>;
}>;

/**
 * Rejects a `categoryId` already used by another **active** loan, regardless of `loanType` — a
 * mortgage and a car loan cannot share a category any more than two mortgages could (TICKET-LOAN-03).
 * `existingLoans`/`editingLoanId` are read lazily on every validation pass (not captured once), so
 * this stays correct as the parent's loan list changes and as the same form instance is reused to
 * edit a different loan across opens — the `uniqueCoOwnerIbansValidator` shape, parameterized.
 */
const duplicateCategoryValidator =
  (existingLoans: () => readonly Loan[], editingLoanId: () => number | null): ValidatorFn =>
  (control): ValidationErrors | null => {
    const group = control as LoanFormGroup;
    const categoryId = Number(group.controls.categoryId?.value);
    if (!categoryId) {
      return null;
    }
    const editingId = editingLoanId();
    const conflict = existingLoans().find(
      (loan) => loan.categoryId === categoryId && loan.id !== editingId,
    );
    return conflict ? { duplicateCategory: { loanName: conflict.name } } : null;
  };

/** Add/edit dialog for one loan (TICKET-LOAN-03) — `app-goal-form`'s shape. */
@Component({
  selector: 'app-loan-form',
  imports: [
    ReactiveFormsModule,
    ButtonComponent,
    FieldsetComponent,
    InputComponent,
    LabelComponent,
    MmModalComponent,
    SelectComponent,
  ],
  templateUrl: './loan-form.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LoanFormComponent {
  readonly open = model(false);
  readonly loan = input<Loan | null>(null);
  /** Every **active** loan, used only for the duplicate-category check — excludes `loan()` itself. */
  readonly existingLoans = input<Loan[]>([]);
  readonly saved = output<LoanFormValue>();

  protected readonly loanTypeOptions = LOAN_TYPE_OPTIONS;

  private readonly categoriesStore = inject(CategoriesStore);

  /** Active, expense-kind categories only — a loan's linked category can never be an income/neutral one. */
  protected readonly categoryOptions = computed(() =>
    this.categoriesStore
      .activeCategories()
      .filter((category) => category.kind === 'expense')
      .map((category) => ({ value: String(category.id), label: category.name })),
  );

  private readonly formBuilder = inject(FormBuilder);

  protected readonly form = this.formBuilder.nonNullable.group(
    {
      name: ['', [Validators.required, nonBlankValidator]],
      loanType: this.formBuilder.nonNullable.control<Loan['loanType'] | ''>(
        '',
        Validators.required,
      ),
      // String controls bound to `<input type="number">`, coerced once on submit — a typed
      // non-number fails its validator rather than reaching the store as `NaN`.
      principal: ['', [Validators.required, positiveAmountValidator]],
      interestRate: ['', [Validators.required, percentageValidator]],
      termMonths: ['', [Validators.required, positiveIntegerValidator]],
      startDate: [today(), Validators.required],
      categoryId: ['', Validators.required],
    },
    {
      validators: duplicateCategoryValidator(
        () => this.existingLoans(),
        () => this.loan()?.id ?? null,
      ),
    },
  );

  protected readonly title = computed(() => (this.loan() ? 'Edit loan' : 'Add loan'));
  protected readonly submitLabel = computed(() => (this.loan() ? 'Save changes' : 'Add loan'));

  protected get nameError(): string {
    const control = this.form.controls.name;
    return control.touched && control.invalid ? 'Give the loan a name.' : '';
  }

  protected get loanTypeError(): string {
    const control = this.form.controls.loanType;
    return control.touched && control.invalid ? 'Choose a loan type.' : '';
  }

  protected get principalError(): string {
    const control = this.form.controls.principal;
    if (!control.touched || control.valid) return '';
    return control.hasError('required')
      ? 'Enter the original loan amount.'
      : 'Enter an amount greater than zero.';
  }

  protected get interestRateError(): string {
    const control = this.form.controls.interestRate;
    if (!control.touched || control.valid) return '';
    return control.hasError('required')
      ? 'Enter the annual interest rate.'
      : 'Enter a rate between 0 and 100.';
  }

  protected get termMonthsError(): string {
    const control = this.form.controls.termMonths;
    if (!control.touched || control.valid) return '';
    return control.hasError('required')
      ? 'Enter the loan term in months.'
      : 'Enter a whole number of months greater than zero.';
  }

  protected get categoryError(): string {
    const control = this.form.controls.categoryId;
    return control.touched && control.invalid ? 'Choose a category.' : '';
  }

  /**
   * The cross-field conflict, shown regardless of `categoryId.touched` — the `account-form`
   * precedent for `duplicateIban`, which the whole-form error surfaces unconditionally rather than
   * behind a single control's touch state. Gating it on `categoryId.touched` would hide a real
   * conflict the moment the category is chosen programmatically (as `resetForm` does while editing).
   */
  protected get duplicateCategoryError(): string {
    if (!this.form.hasError('duplicateCategory')) return '';
    const conflict = (this.form.errors as { duplicateCategory: { loanName: string } })
      .duplicateCategory;
    return `This category is already linked to ${conflict.loanName}.`;
  }

  constructor() {
    effect(() => {
      if (this.open()) {
        this.resetForm();
      }
    });
  }

  private resetForm(): void {
    const existing = this.loan();
    this.form.reset(
      existing
        ? {
            name: existing.name,
            loanType: existing.loanType,
            principal: String(existing.principal),
            interestRate: String(existing.interestRate),
            termMonths: String(existing.termMonths),
            startDate: existing.startDate,
            categoryId: String(existing.categoryId),
          }
        : {
            name: '',
            loanType: '',
            principal: '',
            interestRate: '',
            termMonths: '',
            startDate: today(),
            categoryId: '',
          },
    );
  }

  protected submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const value = this.form.getRawValue();
    this.saved.emit({
      name: value.name.trim(),
      loanType: value.loanType as Loan['loanType'],
      principal: Number(value.principal),
      interestRate: Number(value.interestRate),
      termMonths: Number(value.termMonths),
      startDate: value.startDate,
      categoryId: Number(value.categoryId),
    });
    this.open.set(false);
  }

  protected cancel(): void {
    this.open.set(false);
  }
}
