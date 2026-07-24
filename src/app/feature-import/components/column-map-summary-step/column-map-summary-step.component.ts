import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { FlexComponent, LabelComponent, TypographyComponent } from '@/shared/ui';

export type MapperSummaryRow = { label: string; column: string; sample?: string };

/**
 * The guided flow's terminus (TICKET-IMP-09) — recaps every mapped column and hosts the
 * "remember this mapping" checkbox (moved here from the bottom of the form). The "apply to
 * remaining files" checkbox lives in the always-visible global options instead, not here, since
 * it's a batch-level decision rather than something tied to this particular file's summary.
 */
@Component({
  selector: 'app-column-map-summary-step',
  imports: [ReactiveFormsModule, FlexComponent, LabelComponent, TypographyComponent],
  templateUrl: './column-map-summary-step.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ColumnMapSummaryStepComponent {
  readonly rows = input.required<MapperSummaryRow[]>();
  readonly rememberControl = input.required<FormControl<boolean>>();
}
