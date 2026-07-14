import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import {
  DateRangeInputComponent,
  type DateRangeValue,
} from '../date-range-input/date-range-input.component';

export type RangeGroupingPreset =
  | 'this-week'
  | 'this-month'
  | 'last-month'
  | 'last-31-days'
  | 'this-quarter'
  | 'last-quarter'
  | 'this-year'
  | 'last-year'
  | 'last-365-days'
  | 'year-to-date'
  | 'all-time'
  | 'custom';

export type RangeGroupingSwitcherValue = {
  preset: RangeGroupingPreset;
  from: string;
  to: string;
};

/**
 * Presentational date-range switcher (FR-STAT-7) — holds no state of its own; the caller owns the
 * value and reacts to the outputs. Bucket-granularity is chart-local state, not part of this
 * global switcher (TICKET-STAT-15) — see `mm-granularity-picker`.
 */
@Component({
  selector: 'mm-range-grouping-switcher',
  imports: [DateRangeInputComponent],
  templateUrl: './range-grouping-switcher.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RangeGroupingSwitcherComponent {
  readonly value = input.required<RangeGroupingSwitcherValue>();

  readonly presetChange = output<RangeGroupingPreset>();
  readonly customRangeChange = output<{ from: string; to: string }>();

  protected onPresetChange(raw: string): void {
    this.presetChange.emit(raw as RangeGroupingPreset);
  }

  protected onRangeChange(range: DateRangeValue): void {
    this.customRangeChange.emit(range);
  }
}
