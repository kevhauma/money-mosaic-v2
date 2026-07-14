import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';

export type GranularityPickerValue = 'day' | 'week' | 'month' | 'quarter';

const GRANULARITIES: GranularityPickerValue[] = ['day', 'week', 'month', 'quarter'];

/**
 * Presentational day/week/month/quarter bucket-size toggle (TICKET-STAT-15), extracted so each
 * trend chart can own its own instance instead of duplicating the button-group markup. Holds no
 * state of its own — the caller owns the value and reacts to `valueChange`.
 */
@Component({
  selector: 'mm-granularity-picker',
  imports: [],
  templateUrl: './granularity-picker.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class GranularityPickerComponent {
  readonly value = input.required<GranularityPickerValue>();

  readonly valueChange = output<GranularityPickerValue>();

  protected readonly granularities = GRANULARITIES;

  protected granularityLabel(granularity: GranularityPickerValue): string {
    return granularity.charAt(0).toUpperCase() + granularity.slice(1);
  }
}
