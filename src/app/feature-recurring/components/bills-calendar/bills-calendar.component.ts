import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { tablerChevronLeft, tablerChevronRight } from '@ng-icons/tabler-icons';
import { projectRecurringOccurrences, type ProjectedOccurrence } from '@/core/stats';
import { AppSettingsStore, chartBillsView, chartVisibleMonth } from '@/core/state';
import {
  ButtonComponent,
  FlexComponent,
  PaperComponent,
  PrivacyBlurComponent,
  TabsComponent,
  TypographyComponent,
  type TabDefinition,
} from '@/shared/ui';
import {
  bucketDateBoundaries,
  bucketKeyForDate,
  bucketKeysInRange,
  cycleColumnLabels,
  formatAlignedRangeLabel,
  formatCurrency,
  formatDate,
  mondayFirstWeekdayIndex,
  shiftRangeByCalendarUnit,
} from '@/shared/utils';
import { RecurringSeriesStore } from '../../recurring-series.store';
import { BillsDayListComponent } from '../bills-day-list/bills-day-list.component';
import { BillsMonthGridComponent } from '../bills-month-grid/bills-month-grid.component';
import type {
  BillAccessibleRow,
  BillEntry,
  BillListDay,
  CalendarDayCell,
} from '../../bills-calendar-vm';

/** Renamed with the route (was `explore-bills-calendar`) — the store is session-only, so nothing persisted carries the old key. */
const CHART_KEY = 'recurring-bills-calendar';

const MS_PER_DAY = 24 * 60 * 60 * 1000;

/** What the screen-reader table says in place of an amount while privacy mode is on. */
const HIDDEN_AMOUNT = 'hidden';

/**
 * Said in words wherever an overdue expectation is only *shown* by an outline (TICKET-REC-04) —
 * colour is never the sole carrier of a meaning, and the `sr-only` mirror sees no styling at all.
 */
const OVERDUE_SUFFIX = ' — not yet arrived';

/**
 * Entries a day cell shows before collapsing the rest into "+N more". Four fits the cell height a
 * week row can give without the grid growing past a screenful; nothing is lost, since the full day
 * is on the cell's own tooltip and in the list view.
 */
const MAX_VISIBLE_PER_DAY = 4;

const VIEW_TABS: TabDefinition[] = [
  { label: 'Calendar', value: 'calendar' },
  { label: 'List', value: 'list' },
];

const shiftDays = (isoDate: string, days: number): string =>
  new Date(new Date(`${isoDate}T00:00:00Z`).getTime() + days * MS_PER_DAY)
    .toISOString()
    .slice(0, 10);

/**
 * The `YYYY-MM` key `count` whole months **forward** of `monthKey`. `shiftRangeByCalendarUnit`
 * counts backwards (`count` = how many units *ago*), so the sign is inverted here once rather than
 * at each call site.
 */
const shiftMonth = (monthKey: string, count: number): string => {
  const { start, end } = bucketDateBoundaries(monthKey, 'month');
  return bucketKeyForDate(shiftRangeByCalendarUnit(start, end, 'month', -count).from, 'month');
};

/**
 * Upcoming bills: every detected recurring payment projected onto the days it is expected to land
 * (FR-REC-3, TICKET-REC-03), as a browsable month grid or the same month as a date-ordered list.
 *
 * **Projected, not promised.** The app knows rhythms, not bill contracts, so every figure here is
 * an expectation and the copy says "expected" rather than "due" — a payment can land a day or two
 * off its cell, which is inherent to inferring a rhythm rather than reading a contract.
 *
 * This component owns the month, the view and the projection; the two child components own only
 * their layouts. Both render the identical `projectRecurringOccurrences` output, so switching views
 * can change the shape of what is shown but never its content.
 *
 * The visible month and the chosen view are session-scoped in `ChartOptionsStore`. This section
 * looks *forward* from today at projections, which is half of why the two recurring sections moved
 * off `/explore` onto their own route: they never obeyed that page's backward-looking date range,
 * and here there is none to disobey.
 *
 * Renders nothing at all when no series was detected — REC-02's panel directly above already
 * explains why, and a second empty state saying the same thing is noise. That "directly above" is
 * now a page-level guarantee: `/recurring` renders exactly these two sections, in that order.
 */
@Component({
  selector: 'app-bills-calendar',
  imports: [
    NgIcon,
    BillsDayListComponent,
    BillsMonthGridComponent,
    ButtonComponent,
    FlexComponent,
    PaperComponent,
    PrivacyBlurComponent,
    TabsComponent,
    TypographyComponent,
  ],
  templateUrl: './bills-calendar.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  viewProviders: [provideIcons({ tablerChevronLeft, tablerChevronRight })],
})
export class BillsCalendarComponent {
  private readonly recurringSeriesStore = inject(RecurringSeriesStore);
  private readonly appSettingsStore = inject(AppSettingsStore);

  protected readonly privacyMode = this.appSettingsStore.privacyModeEnabled;
  protected readonly viewTabs = VIEW_TABS;

  /** Nothing detected → the whole section stands down (REC-02 already said why). */
  protected readonly hasSeries = this.recurringSeriesStore.hasSeries;

  /** Seeded to the current month; browsing is session-scoped, so a reload comes back to today. */
  private readonly monthControl = chartVisibleMonth(CHART_KEY, () =>
    bucketKeyForDate(new Date().toISOString().slice(0, 10), 'month'),
  );
  protected readonly visibleMonth = this.monthControl.value;

  private readonly viewControl = chartBillsView(CHART_KEY, () => 'calendar');
  protected readonly view = this.viewControl.value;

  private readonly monthBounds = computed(() => bucketDateBoundaries(this.visibleMonth(), 'month'));

  /**
   * Whole weeks, Monday-first: from the Monday on or before the 1st to the Sunday on or after the
   * last, so every row has seven cells and the month's days line up under their weekday headers.
   */
  private readonly gridBounds = computed(() => {
    const { start, end } = this.monthBounds();
    return {
      start: shiftDays(start, -mondayFirstWeekdayIndex(start)),
      end: shiftDays(end, 6 - mondayFirstWeekdayIndex(end)),
    };
  });

  /**
   * Projected across the whole **grid**, not just the month: the leading and trailing cells are
   * real days, and one showing empty while a payment is expected on it would be a lie the dimming
   * does not excuse. Everything the header and the list speak for is the month-scoped subset below.
   */
  private readonly gridOccurrences = computed<ProjectedOccurrence[]>(() => {
    const { start, end } = this.gridBounds();
    // `activeSeries`, not `series`: a stopped subscription must not keep billing you in a forecast,
    // least of all directly below a panel that has just called it stopped (TICKET-REC-04).
    return projectRecurringOccurrences(this.recurringSeriesStore.activeSeries(), start, end);
  });

  /** The visible month alone — what "expected this month", the list and the hidden table all mean. */
  private readonly monthOccurrences = computed(() => {
    const { start, end } = this.monthBounds();
    return this.gridOccurrences().filter(({ date }) => date >= start && date <= end);
  });

  private readonly entriesByDate = computed(() => {
    const byDate = new Map<string, BillEntry[]>();
    for (const occurrence of this.gridOccurrences()) {
      const entry: BillEntry = {
        seriesKey: occurrence.seriesKey,
        label: occurrence.label,
        amount: formatCurrency(occurrence.amount),
        overdue: occurrence.overdue,
      };
      const day = byDate.get(occurrence.date);
      if (day) day.push(entry);
      else byDate.set(occurrence.date, [entry]);
    }
    return byDate;
  });

  /** "July 2026", through the app's own locale-aware month labeller rather than a second `Intl` call. */
  protected readonly monthLabel = computed(() => {
    const { start, end } = this.monthBounds();
    return formatAlignedRangeLabel(start, end) ?? this.visibleMonth();
  });

  protected readonly monthTotal = computed(() =>
    formatCurrency(this.monthOccurrences().reduce((total, { amount }) => total + amount, 0)),
  );

  protected readonly weekdayLabels = computed(() => cycleColumnLabels('day-of-week'));

  protected readonly dayCells = computed<CalendarDayCell[]>(() => {
    const { start, end } = this.monthBounds();
    const { start: gridStart, end: gridEnd } = this.gridBounds();
    const entriesByDate = this.entriesByDate();
    const privacyMode = this.privacyMode();
    const today = this.recurringSeriesStore.today();

    return bucketKeysInRange(gridStart, gridEnd, 'day').map((date) => {
      const entries = entriesByDate.get(date) ?? [];
      const hidden = Math.max(0, entries.length - MAX_VISIBLE_PER_DAY);

      return {
        date,
        dayLabel: String(Number(date.slice(8, 10))),
        inMonth: date >= start && date <= end,
        isToday: date === today,
        entries: entries.slice(0, MAX_VISIBLE_PER_DAY),
        moreLabel: hidden > 0 ? `+${hidden} more` : '',
        // Amount-free under privacy mode: the browser paints a native tooltip outside the
        // `mm-privacy-blur` box, so a figure left in here would survive the blur entirely.
        fullDayTitle: entries
          .map(
            ({ label, amount, overdue }) =>
              `${label} ${privacyMode ? HIDDEN_AMOUNT : amount}${overdue ? OVERDUE_SUFFIX : ''}`,
          )
          .join('\n'),
      };
    });
  });

  /** The month's occurrences grouped by day, with empty days simply absent. */
  protected readonly listDays = computed<BillListDay[]>(() => {
    const { start, end } = this.monthBounds();
    const today = this.recurringSeriesStore.today();

    return [...this.entriesByDate().entries()]
      .filter(([date]) => date >= start && date <= end)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, entries]) => ({
        date,
        dateLabel: formatDate(date),
        headingWeight: date === today ? ('medium' as const) : ('normal' as const),
        headingColor: date === today ? ('primary' as const) : ('base-content' as const),
        entries,
      }));
  });

  /** The grid's figures as DOM text for assistive tech (TICKET-STAT-20) — the grid is a layout, not a table. */
  protected readonly accessibleRows = computed<BillAccessibleRow[]>(() => {
    const privacyMode = this.privacyMode();
    return this.monthOccurrences().map((occurrence) => ({
      dateLabel: formatDate(occurrence.date),
      label: `${occurrence.label}${occurrence.overdue ? OVERDUE_SUFFIX : ''}`,
      // Withheld, not blurred: `.sr-only` clips the table to a 1px box, so a CSS filter paints
      // nothing and a screen reader would read the amount out regardless (TICKET-PRIV-01).
      amount: privacyMode ? HIDDEN_AMOUNT : formatCurrency(occurrence.amount),
    }));
  });

  /**
   * `mm-tabs` speaks in plain strings (its values can be route paths), so the two the switcher
   * offers are narrowed back to `BillsView` here rather than cast — anything else is ignored.
   */
  protected setView(view: string | undefined): void {
    if (view === 'calendar' || view === 'list') this.viewControl.set(view);
  }

  protected stepMonth(count: number): void {
    this.monthControl.set(shiftMonth(this.visibleMonth(), count));
  }

  protected goToThisMonth(): void {
    this.monthControl.set(bucketKeyForDate(this.recurringSeriesStore.today(), 'month'));
  }
}
