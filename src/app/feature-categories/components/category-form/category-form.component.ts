import {
  ChangeDetectionStrategy,
  Component,
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
  type FormControl,
  type FormGroup,
  type ValidationErrors,
  type ValidatorFn,
} from '@angular/forms';
import type { Category } from '@/core/data-access';
import {
  ButtonComponent,
  FieldsetComponent,
  InputComponent,
  LabelComponent,
  MmModalComponent,
  SelectComponent,
} from '@/shared/ui';
import { CATEGORY_ICON_OPTIONS } from '../../category-icons';

export type CategoryFormValue = Omit<Category, 'id' | 'archived' | 'isSystem'>;

/**
 * Cross-field check on the applicability window (TICKET-CAT-10): a category cannot stop applying
 * before it started. Colocated with the form that owns it rather than in `shared/utils/validators/`
 * — nothing else edits a date pair yet, and a shared validator with one caller is a guess about the
 * second one. Either bound may be blank; a window open on one side is the normal case.
 */
const applicabilityRangeValidator: ValidatorFn = (control): ValidationErrors | null => {
  // Typed rather than read by string key, the `uniqueCoOwnerIbansValidator` precedent: renaming a
  // control then fails to compile instead of silently switching the validator off.
  const group = control as FormGroup<{
    activeFrom: FormControl<string>;
    activeUntil: FormControl<string>;
  }>;
  const { activeFrom, activeUntil } = group.controls;

  if (!activeFrom.value || !activeUntil.value) return null;
  return activeFrom.value <= activeUntil.value ? null : { applicabilityRange: true };
};

@Component({
  selector: 'app-category-form',
  imports: [
    ReactiveFormsModule,
    ButtonComponent,
    FieldsetComponent,
    InputComponent,
    LabelComponent,
    SelectComponent,
    MmModalComponent,
  ],
  templateUrl: './category-form.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CategoryFormComponent {
  readonly open = model(false);
  readonly category = input<Category | null>(null);
  readonly saved = output<CategoryFormValue>();

  protected readonly iconOptions = CATEGORY_ICON_OPTIONS;

  private readonly formBuilder = inject(FormBuilder);

  protected readonly form = this.formBuilder.nonNullable.group(
    {
      name: ['', Validators.required],
      kind: this.formBuilder.nonNullable.control<Category['kind']>('expense', Validators.required),
      group: [''],
      color: ['#7F77DD', Validators.required],
      icon: ['tag', Validators.required],
      // Blank means "unbounded on this side", which is why neither is `required` — see
      // `applicabilityRangeValidator` and `Category.activeFrom`'s own docs.
      activeFrom: [''],
      activeUntil: [''],
    },
    { validators: applicabilityRangeValidator },
  );

  constructor() {
    effect(() => {
      if (this.open()) {
        this.resetForm();
      }
    });
  }

  private resetForm(): void {
    const existing = this.category();
    this.form.reset(
      existing
        ? {
            name: existing.name,
            kind: existing.kind,
            group: existing.group ?? '',
            color: existing.color,
            icon: existing.icon,
            activeFrom: existing.activeFrom ?? '',
            activeUntil: existing.activeUntil ?? '',
          }
        : {
            name: '',
            kind: 'expense',
            group: '',
            color: '#7F77DD',
            icon: 'tag',
            activeFrom: '',
            activeUntil: '',
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
      ...value,
      group: value.group.trim() || undefined,
      // A cleared date is `undefined`, not `''`: an empty string would persist as a bound that
      // compares as earlier than every real date.
      activeFrom: value.activeFrom || undefined,
      activeUntil: value.activeUntil || undefined,
    });
    this.open.set(false);
  }

  protected cancel(): void {
    this.open.set(false);
  }
}
