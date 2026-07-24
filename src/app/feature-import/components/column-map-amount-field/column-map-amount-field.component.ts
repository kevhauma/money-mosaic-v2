import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { ButtonComponent, FieldsetComponent, FlexComponent, SelectComponent } from '@/shared/ui';
import { ColumnMapSampleCaptionComponent } from '../column-map-sample-caption/column-map-sample-caption.component';

export type AmountMode = 'single' | 'split';

/**
 * The Amount step's editor (TICKET-IMP-09) — a segmented toggle (mirroring TICKET-TXN-08's shipped
 * `join`/`btn-primary`/`btn-outline` markup, see `transaction-filters.component.html`) switching
 * between a single `amount` column or separate `debit`/`credit` columns. Owns no form/mode state —
 * the parent decides `mode()` and clears the inactive control(s) on `modeChange`.
 */
@Component({
  selector: 'app-column-map-amount-field',
  imports: [
    ReactiveFormsModule,
    ButtonComponent,
    ColumnMapSampleCaptionComponent,
    FieldsetComponent,
    FlexComponent,
    SelectComponent,
  ],
  templateUrl: './column-map-amount-field.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ColumnMapAmountFieldComponent {
  readonly mode = input.required<AmountMode>();
  readonly headers = input.required<string[]>();
  readonly amountControl = input.required<FormControl<string>>();
  readonly debitControl = input.required<FormControl<string>>();
  readonly creditControl = input.required<FormControl<string>>();
  readonly amountSample = input<string>();
  readonly debitSample = input<string>();
  readonly creditSample = input<string>();
  readonly amountWarning = input<string>();
  readonly debitWarning = input<string>();
  readonly creditWarning = input<string>();

  readonly modeChange = output<AmountMode>();
  readonly advanced = output<void>();
}
