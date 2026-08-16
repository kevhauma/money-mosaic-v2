import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { tablerChevronLeft, tablerChevronRight } from '@ng-icons/tabler-icons';
import { QUICK_RANGES, quickRangeById } from '@/shared/utils';
import { ButtonComponent } from '../button/button.component';
import {
  DateRangeInputComponent,
  type DateRangeValue,
} from '../date-range-input/date-range-input.component';
import { FlexComponent } from '../flex/flex.component';

export type RangeGroupingSwitcherValue = {
  /** A `QUICK_RANGES` id (TICKET-STAT-37), or `'custom'` for a hand-built range. */
  preset: string;
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
  imports: [DateRangeInputComponent, ButtonComponent, FlexComponent, NgIcon],
  templateUrl: './range-grouping-switcher.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  viewProviders: [provideIcons({ tablerChevronLeft, tablerChevronRight })],
})
export class RangeGroupingSwitcherComponent {
  readonly value = input.required<RangeGroupingSwitcherValue>();

  readonly presetChange = output<string>();
  readonly customRangeChange = output<{ from: string; to: string }>();
  readonly rangeShift = output<-1 | 1>();

  protected readonly quickRanges = QUICK_RANGES;

  /** Entries with no fixed, repeatable length ("so far" variants, `all-time`) have no target to shift to (TICKET-STAT-16), catalogue-driven via `QuickRangeEntry.steppingDisabled`. */
  protected readonly navigationDisabled = computed(
    () => quickRangeById(this.value().preset)?.steppingDisabled === true,
  );

  protected onPresetChange(raw: string): void {
    this.presetChange.emit(raw);
  }

  protected onRangeChange(range: DateRangeValue): void {
    this.customRangeChange.emit(range);
  }

  protected onPrevious(): void {
    this.rangeShift.emit(-1);
  }

  protected onNext(): void {
    this.rangeShift.emit(1);
  }
}
