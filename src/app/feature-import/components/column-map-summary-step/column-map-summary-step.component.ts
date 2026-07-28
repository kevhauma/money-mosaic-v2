import { ChangeDetectionStrategy, Component, input, model } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import {
  FieldsetComponent,
  FlexComponent,
  InputComponent,
  LabelComponent,
  TypographyComponent,
} from '@/shared/ui';
import type { MapperSummaryRow } from '../../column-mapping';

/**
 * The guided flow's terminus (TICKET-IMP-09) — recaps every mapped column and hosts the mapping
 * profile name field, the "remember this mapping" checkbox, and the "apply to remaining files"
 * checkbox (all moved here from the top of the form/always-visible global options), since none of
 * them are meaningful to decide before the mapping itself is done.
 */
@Component({
  selector: 'app-column-map-summary-step',
  imports: [
    ReactiveFormsModule,
    FieldsetComponent,
    FlexComponent,
    InputComponent,
    LabelComponent,
    TypographyComponent,
  ],
  templateUrl: './column-map-summary-step.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ColumnMapSummaryStepComponent {
  readonly rows = input.required<MapperSummaryRow[]>();
  readonly nameControl = input.required<FormControl<string>>();
  readonly rememberControl = input.required<FormControl<boolean>>();

  readonly canOfferApplyToRemaining = input(false);
  readonly remainingFilesCount = input(0);
  readonly applyToRemaining = model(false);

  protected onApplyToRemainingChange(event: Event): void {
    this.applyToRemaining.set((event.target as HTMLInputElement).checked);
  }
}
