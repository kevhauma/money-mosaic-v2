import {
  ChangeDetectionStrategy,
  Component,
  CUSTOM_ELEMENTS_SCHEMA,
  ElementRef,
  computed,
  input,
  output,
  signal,
  viewChild,
} from '@angular/core';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { tablerChevronsLeft, tablerChevronsRight } from '@ng-icons/tabler-icons';
import 'cally';
import {
  daisyClasses,
  formatAlignedRangeLabel,
  formatDate,
  formatIsoDate,
  parseIsoDate,
} from '@/shared/utils';
import { ButtonComponent } from '../button/button.component';
import { DropdownComponent } from '../dropdown/dropdown.component';

export type DateRangeValue = { from: string; to: string };
export type DateRangeInputSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl';

const todayIso = (): string => new Date().toISOString().slice(0, 10);

/** Cally's `focusedDate`-carrying custom elements (TICKET-STAT-41) — a plain JS property, not reflected as an attribute, so it's read off the live DOM node rather than guessed as `[attr.…]`. */
type FocusableCalendarElement = HTMLElement & { focusedDate?: string };

/** Presentational single-field date-range picker (a Cally `calendar-range` popover) — holds no state of its own; the caller owns the value and reacts to `valueChange`. */
@Component({
  selector: 'mm-date-range-input',
  imports: [ButtonComponent, DropdownComponent, NgIcon],
  templateUrl: './date-range-input.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  viewProviders: [provideIcons({ tablerChevronsLeft, tablerChevronsRight })],
})
export class DateRangeInputComponent {
  readonly value = input.required<DateRangeValue>();
  readonly disabled = input(false);
  readonly size = input<DateRangeInputSize>('md');
  readonly class = input('', { alias: 'class' });

  readonly valueChange = output<DateRangeValue>();

  /**
   * Which month Cally displays (TICKET-STAT-41) — `undefined` until the year controls are used,
   * which leaves Cally's own default (the month containing `value`, or today) untouched. Bound as
   * a property (`[focusedDate]`), not `[attr.focused-date]`: Cally/Atomico's `focusedDate` is a
   * plain JS prop, and Angular property binding sets it directly regardless of how (or whether)
   * it's reflected as an attribute — no need to guess the attribute's casing.
   */
  protected readonly focusedDate = signal<string | undefined>(undefined);
  private readonly calendarRange = viewChild<ElementRef<FocusableCalendarElement>>('calendarRange');

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
    return formatAlignedRangeLabel(from, to) ?? `${formatDate(from)} – ${formatDate(to)}`;
  });

  protected onCalendarChange(event: Event): void {
    const { value } = event.target as HTMLElement & { value: string };
    const [from, to] = value.split('/');
    if (from && to) {
      this.valueChange.emit({ from, to });
    }
  }

  /**
   * Repositions the calendar by exactly one year (TICKET-STAT-41) — navigation only, never
   * touches `value`/`valueChange`, so an in-progress range pick (one end already chosen) survives
   * untouched. The starting point is whichever of these resolves first: the signal (already
   * navigated once), the calendar's own live `focusedDate` (Cally's default positioning, read off
   * the DOM since it's never round-tripped back into this component otherwise), the current
   * `value`'s `from`, or today.
   */
  protected shiftFocusedYear(direction: -1 | 1): void {
    const current =
      this.focusedDate() ??
      this.calendarRange()?.nativeElement.focusedDate ??
      this.value().from ??
      todayIso();
    const shifted = parseIsoDate(current || todayIso());
    shifted.setUTCFullYear(shifted.getUTCFullYear() + direction);
    this.focusedDate.set(formatIsoDate(shifted));
  }
}
