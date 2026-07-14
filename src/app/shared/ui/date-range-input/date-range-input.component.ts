import {
  ChangeDetectionStrategy,
  Component,
  CUSTOM_ELEMENTS_SCHEMA,
  computed,
  input,
  output,
} from '@angular/core';
import 'cally';
import { formatAlignedRangeLabel } from '@/core/stats/date-buckets';
import { daisyClasses } from '@/shared/utils';

export type DateRangeValue = { from: string; to: string };
export type DateRangeInputSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl';

export const formatDisplayDate = (iso: string): string => {
  const [year, month, day] = iso.split('-').map(Number);
  return new Date(year, month - 1, day).toLocaleDateString('en-GB');
};

/** Presentational single-field date-range picker (a Cally `calendar-range` popover) — holds no state of its own; the caller owns the value and reacts to `valueChange`. */
@Component({
  selector: 'mm-date-range-input',
  imports: [],
  templateUrl: './date-range-input.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
})
export class DateRangeInputComponent {
  readonly value = input.required<DateRangeValue>();
  readonly disabled = input(false);
  readonly size = input<DateRangeInputSize>('md');
  readonly class = input('', { alias: 'class' });

  readonly valueChange = output<DateRangeValue>();

  protected readonly triggerClasses = computed(() =>
    daisyClasses(
      'input justify-start text-left font-normal',
      [this.size() !== 'md' && `input-${this.size()}`],
      this.class(),
    ),
  );

  /** Cally's ISO-8601 range format (`YYYY-MM-DD/YYYY-MM-DD`); empty until both ends are set. */
  protected readonly calendarValue = computed(() => {
    const { from, to } = this.value();
    return from && to ? `${from}/${to}` : '';
  });

  protected readonly displayLabel = computed(() => {
    const { from, to } = this.value();
    if (!from || !to) {
      return 'Select date range';
    }
    return (
      formatAlignedRangeLabel(from, to) ?? `${formatDisplayDate(from)} – ${formatDisplayDate(to)}`
    );
  });

  protected onCalendarChange(event: Event): void {
    const { value } = event.target as HTMLElement & { value: string };
    const [from, to] = value.split('/');
    if (from && to) {
      this.valueChange.emit({ from, to });
    }
  }
}
