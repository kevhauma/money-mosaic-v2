import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import {
  ButtonComponent,
  FieldsetComponent,
  FlexComponent,
  LabelComponent,
  SelectComponent,
} from '@/shared/ui';
import type { ColumnFieldDef } from '../import-map-step/import-map-step.component';
import { ColumnMapSampleCaptionComponent } from '../column-map-sample-caption/column-map-sample-caption.component';

/**
 * The single-select step editor for Date/Description/Own IBAN/Balance (TICKET-IMP-09) — the
 * horizontal stepper's counterpart to TICKET-IMP-07's `ColumnMapActiveFieldComponent`, minus the
 * `isLast`/"Done" handling: the guided flow's terminus is now the Summary step, so every field
 * step always has a real next step to advance to.
 */
@Component({
  selector: 'app-column-map-simple-field',
  imports: [
    ReactiveFormsModule,
    ButtonComponent,
    ColumnMapSampleCaptionComponent,
    FieldsetComponent,
    FlexComponent,
    LabelComponent,
    SelectComponent,
  ],
  templateUrl: './column-map-simple-field.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ColumnMapSimpleFieldComponent {
  readonly field = input.required<ColumnFieldDef>();
  readonly control = input.required<FormControl<string>>();
  readonly headers = input.required<string[]>();
  readonly resolvedSample = input<string>();
  readonly duplicateWarning = input<string>();

  readonly advanced = output<void>();

  protected advanceLabel(): string {
    if (this.field().required) return 'Next';
    return this.control().value ? 'Next' : 'Skip';
  }
}
