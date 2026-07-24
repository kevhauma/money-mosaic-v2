import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { ButtonComponent, FieldsetComponent, FlexComponent, SelectComponent } from '@/shared/ui';
import { ColumnMapSampleCaptionComponent } from '../column-map-sample-caption/column-map-sample-caption.component';

/**
 * The Counterparty step's editor (TICKET-IMP-09) — merges what were two separate guided-flow
 * fields (`counterpartyName`, `counterpartyIban`) into one step, both remaining optional.
 */
@Component({
  selector: 'app-column-map-counterparty-field',
  imports: [
    ReactiveFormsModule,
    ButtonComponent,
    ColumnMapSampleCaptionComponent,
    FieldsetComponent,
    FlexComponent,
    SelectComponent,
  ],
  templateUrl: './column-map-counterparty-field.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ColumnMapCounterpartyFieldComponent {
  readonly headers = input.required<string[]>();
  readonly nameControl = input.required<FormControl<string>>();
  readonly ibanControl = input.required<FormControl<string>>();
  readonly nameSample = input<string>();
  readonly ibanSample = input<string>();
  readonly nameWarning = input<string>();
  readonly ibanWarning = input<string>();

  readonly advanced = output<void>();
}
