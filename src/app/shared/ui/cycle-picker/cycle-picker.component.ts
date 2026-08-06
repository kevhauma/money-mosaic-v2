import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { daisyClasses } from '@/shared/utils';

/**
 * Structurally `shared/utils`' `CycleKey`, restated here rather than imported — the same deliberate
 * decoupling `GranularityPickerComponent` makes for `Granularity`, keeping a presentational
 * primitive independent of the calendar vocabulary module. The two can't silently drift: the panel
 * assigns one to the other, so a member added on either side fails to compile at that call site
 * until it lands here too.
 */
export type CyclePickerValue = 'day-of-week' | 'day-of-month' | 'month-of-year' | 'quarter-of-year';

const CYCLE_LABELS: Record<CyclePickerValue, string> = {
  'day-of-week': 'Day of week',
  'day-of-month': 'Day of month',
  'month-of-year': 'Month',
  'quarter-of-year': 'Quarter',
};

type CycleOption = { value: CyclePickerValue; label: string };

/**
 * Presentational calendar-cycle toggle for a heatmap's column axis (TICKET-STAT-30) — which
 * repeating position the columns fold onto, not how big a bucket is (that's
 * `mm-granularity-picker`). Holds no state of its own: the caller owns the value and reacts to
 * `valueChange`.
 */
@Component({
  selector: 'mm-cycle-picker',
  imports: [],
  templateUrl: './cycle-picker.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CyclePickerComponent {
  readonly value = input.required<CyclePickerValue>();

  readonly valueChange = output<CyclePickerValue>();

  /** Routes a template `class="..."` onto the real `.join` wrapper, per the shared-primitive convention. */
  readonly class = input('', { alias: 'class' });

  protected readonly classes = computed(() => daisyClasses('join', [], this.class()));

  /** Resolved once here rather than per-cell in the template — templates branch on state, they don't derive it. */
  protected readonly options: CycleOption[] = (Object.keys(CYCLE_LABELS) as CyclePickerValue[]).map(
    (value) => ({ value, label: CYCLE_LABELS[value] }),
  );
}
