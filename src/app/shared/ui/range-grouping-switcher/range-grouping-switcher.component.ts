import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';

export type RangeGroupingGranularity = 'day' | 'week' | 'month' | 'quarter';
export type RangeGroupingPreset =
  'this-month' | 'last-month' | 'this-quarter' | 'this-year' | 'custom';

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
  imports: [],
  templateUrl: './range-grouping-switcher.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RangeGroupingSwitcherComponent {
  readonly value = input.required<RangeGroupingSwitcherValue>();

  readonly presetChange = output<Exclude<RangeGroupingPreset, 'custom'>>();
  readonly customRangeChange = output<{ from: string; to: string }>();
  readonly groupByChange = output<RangeGroupingGranularity>();

  protected readonly granularities = GRANULARITIES;

  protected onPresetChange(raw: string): void {
    if (raw === 'custom') return;
    this.presetChange.emit(raw as Exclude<RangeGroupingPreset, 'custom'>);
  }

  protected onFromChange(from: string): void {
    this.customRangeChange.emit({ from, to: this.value().to });
  }

  protected onToChange(to: string): void {
    this.customRangeChange.emit({ from: this.value().from, to });
  }

  protected granularityLabel(granularity: RangeGroupingGranularity): string {
    return granularity.charAt(0).toUpperCase() + granularity.slice(1);
  }
}
