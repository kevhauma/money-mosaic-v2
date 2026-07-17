import {
  ChangeDetectionStrategy,
  Component,
  effect,
  inject,
  input,
  model,
  output,
} from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
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

  protected readonly form = this.formBuilder.nonNullable.group({
    name: ['', Validators.required],
    kind: this.formBuilder.nonNullable.control<Category['kind']>('expense', Validators.required),
    group: [''],
    color: ['#7F77DD', Validators.required],
    icon: ['tag', Validators.required],
  });

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
          }
        : {
            name: '',
            kind: 'expense',
            group: '',
            color: '#7F77DD',
            icon: 'tag',
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
    });
    this.open.set(false);
  }

  protected cancel(): void {
    this.open.set(false);
  }
}
