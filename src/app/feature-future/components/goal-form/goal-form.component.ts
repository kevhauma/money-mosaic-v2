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
  type ValidationErrors,
} from '@angular/forms';
import type { SavingsGoal } from '@/core/data-access';
import {
  ButtonComponent,
  FieldsetComponent,
  InputComponent,
  LabelComponent,
  MmModalComponent,
} from '@/shared/ui';

export type GoalFormValue = Pick<SavingsGoal, 'name' | 'targetAmount' | 'targetDate' | 'note'>;

/**
 * A name of only spaces is an empty name (TICKET-FUT-04). `Validators.required` alone accepts
 * `'   '`, which would list a goal with no readable label. Colocated with the form that owns it,
 * the `applicabilityRangeValidator` precedent.
 */
const nonBlankValidator = (control: AbstractControl): ValidationErrors | null =>
  (control.value as string).trim() ? null : { blank: true };

/**
 * What a thing costs is a positive number — zero and negative targets have no ETA to compute.
 * Pairs with `Validators.required`, which owns the blank case, so this one only has to answer
 * "is this a number above zero".
 */
const positiveAmountValidator = (control: AbstractControl): ValidationErrors | null => {
  const value = Number(control.value);
  return Number.isFinite(value) && value > 0 ? null : { positiveAmount: true };
};

/** Add/edit dialog for one savings goal (TICKET-FUT-04) — `app-category-form`'s shape. */
@Component({
  selector: 'app-goal-form',
  imports: [
    ReactiveFormsModule,
    ButtonComponent,
    FieldsetComponent,
    InputComponent,
    LabelComponent,
    MmModalComponent,
  ],
  templateUrl: './goal-form.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class GoalFormComponent {
  readonly open = model(false);
  readonly goal = input<SavingsGoal | null>(null);
  readonly saved = output<GoalFormValue>();

  private readonly formBuilder = inject(FormBuilder);

  protected readonly form = this.formBuilder.nonNullable.group({
    name: ['', [Validators.required, nonBlankValidator]],
    // A string control bound to `<input type="number">` — coerced once on submit, so a typed
    // non-number fails `positiveAmountValidator` rather than reaching the store as `NaN`.
    targetAmount: ['', [Validators.required, positiveAmountValidator]],
    // Optional, but labelled as a real question rather than buried: TICKET-FUT-09's second mode has
    // nothing to solve for without it.
    targetDate: [''],
    note: [''],
  });

  /** Dialog chrome, derived once here rather than as ternaries in two bindings. */
  protected readonly title = computed(() => (this.goal() ? 'Edit goal' : 'Add goal'));
  protected readonly submitLabel = computed(() => (this.goal() ? 'Save changes' : 'Add goal'));

  /**
   * The message to show under each field, or `''` for none — resolved here so the template branches
   * on one fact per field instead of unpicking which validator fired. Getters rather than
   * `computed()`, because a reactive-forms control's validity is not a signal.
   */
  protected get nameError(): string {
    const control = this.form.controls.name;
    return control.touched && control.invalid ? 'Give the goal a name.' : '';
  }

  protected get amountError(): string {
    const control = this.form.controls.targetAmount;
    if (!control.touched || control.valid) return '';
    return control.hasError('required')
      ? 'Enter what it costs.'
      : 'Enter an amount greater than zero.';
  }

  constructor() {
    effect(() => {
      if (this.open()) {
        this.resetForm();
      }
    });
  }

  private resetForm(): void {
    const existing = this.goal();
    this.form.reset(
      existing
        ? {
            name: existing.name,
            targetAmount: String(existing.targetAmount),
            targetDate: existing.targetDate ?? '',
            note: existing.note ?? '',
          }
        : { name: '', targetAmount: '', targetDate: '', note: '' },
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
      targetAmount: Number(value.targetAmount),
      // A cleared date/note is `undefined`, not `''` — an empty string would persist as a bound
      // that compares as earlier than every real date.
      targetDate: value.targetDate || undefined,
      note: value.note.trim() || undefined,
    });
    this.open.set(false);
  }

  protected cancel(): void {
    this.open.set(false);
  }
}
