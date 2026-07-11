import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import {
  DateRangeInputComponent,
  type DateRangeValue,
} from '../date-range-input/date-range-input.component';

export type RangeGroupingGranularity = 'day' | 'week' | 'month' | 'quarter';
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
  groupBy: RangeGroupingGranularity;
};

const GRANULARITIES: RangeGroupingGranularity[] = ['day', 'week', 'month', 'quarter'];

/** Presentational range + grouping control (FR-STAT-7) — holds no state of its own; the caller owns the value and reacts to the outputs. */
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
  readonly groupByChange = output<RangeGroupingGranularity>();

  protected readonly granularities = GRANULARITIES;

  protected onPresetChange(raw: string): void {
    this.presetChange.emit(raw as RangeGroupingPreset);
  }

  protected onRangeChange(range: DateRangeValue): void {
    this.customRangeChange.emit(range);
  }

  protected granularityLabel(granularity: RangeGroupingGranularity): string {
    return granularity.charAt(0).toUpperCase() + granularity.slice(1);
  }
}
