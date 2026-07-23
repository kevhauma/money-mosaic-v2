import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import {
  ButtonComponent,
  FieldsetComponent,
  FlexComponent,
  LabelComponent,
  SelectComponent,
  TypographyComponent,
} from '@/shared/ui';
import type { ColumnFieldDef } from '../import-map-step/import-map-step.component';

/**
 * The expanded, editable state of one guided-mapper row (TICKET-IMP-07) — split out of
 * `ColumnMapFieldComponent` purely to keep each state's own template small/flat (fallow flagged
 * the combined active+collapsed template as critically complex). Owns no state; binds straight to
 * the parent's `FormControl` instance via `[formControl]`.
 */
@Component({
  selector: 'app-column-map-active-field',
  imports: [
    ReactiveFormsModule,
    ButtonComponent,
    FieldsetComponent,
    FlexComponent,
    LabelComponent,
    SelectComponent,
    TypographyComponent,
  ],
  templateUrl: './column-map-active-field.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ColumnMapActiveFieldComponent {
  readonly field = input.required<ColumnFieldDef>();
  readonly control = input.required<FormControl<string>>();
  readonly headers = input.required<string[]>();
  readonly isLast = input(false);
  readonly resolvedSample = input<string>();
  readonly duplicateWarning = input<string>();

  readonly advanced = output<void>();

  protected advanceLabel(): string {
    if (this.isLast()) return 'Done';
    if (this.field().required) return 'Next';
    return this.control().value ? 'Next' : 'Skip';
  }
}
