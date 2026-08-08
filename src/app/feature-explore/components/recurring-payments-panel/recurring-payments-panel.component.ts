import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';
import { type RecurringCadence, type RecurringFlags } from '@/core/stats';
import { AppSettingsStore, CategoriesStore } from '@/core/state';
import { CHART_NO_COLOR_FALLBACK } from '@/shared/echarts';
import {
  BadgeComponent,
  ButtonComponent,
  EmptyStateComponent,
  FlexComponent,
  PaperComponent,
  PrivacyBlurComponent,
  TableComponent,
  TypographyComponent,
} from '@/shared/ui';
import { formatCurrency, formatDate } from '@/shared/utils';
import { RecurringSeriesStore } from '../../recurring-series.store';
import type { RecurringFlagBadge, RecurringSeriesRow } from '../../recurring-payments-row-vm';

const UNCATEGORISED_LABEL = 'Uncategorised';

/**
 * What a badge shows in place of an amount while privacy mode is on. Distinct from the bills
 * calendar's `HIDDEN_AMOUNT`, and deliberately so: that one is *read aloud* from an `sr-only`
 * table, so it says the word "hidden"; this one is seen, so it takes the shape of a masked figure.
 */
const MASKED_AMOUNT = '•••';

/**
 * The flags a series carries, as badges (TICKET-REC-04). Each says what happened in words, so the
 * colour only reinforces a meaning the text already carries. A price *cut* is deliberately not
 * `success` and a rise not `error`: the app has no business judging whether a cheaper subscription
 * is good news, only reporting that the price moved.
 */
const flagBadges = (flags: RecurringFlags, privacyMode: boolean): RecurringFlagBadge[] => {
  const badges: RecurringFlagBadge[] = [];

  if (flags.priceChange) {
    const { from, to } = flags.priceChange;
    const amounts = privacyMode
      ? `${MASKED_AMOUNT} → ${MASKED_AMOUNT}`
      : `${formatCurrency(from)} → ${formatCurrency(to)}`;
    badges.push({
      kind: 'priceChange',
      text: `Price ${to > from ? '↑' : '↓'} ${amounts}`,
      color: 'info',
    });
  }
  if (flags.overdue) {
    // "Overdue —" and not just the date: the row's own "Next expected" column already shows that
    // date, so without the word the badge's only signal would be its colour.
    badges.push({
      kind: 'overdue',
      text: `Overdue — expected ${formatDate(flags.overdue.expectedDate)}`,
      color: 'warning',
    });
  }
  if (flags.stopped) {
    badges.push({ kind: 'stopped', text: 'Stopped', color: 'neutral' });
  }

  return badges;
};

/** Cadence as a word, since "quarterly" is a rhythm the user reads, not an enum they decode. */
const CADENCE_LABELS: Record<RecurringCadence, string> = {
  weekly: 'Weekly',
  monthly: 'Monthly',
  quarterly: 'Quarterly',
  yearly: 'Yearly',
};

/**
 * The Explore page's recurring-payments section (FR-REC-2, TICKET-REC-02) — one list of every
 * payment `detectRecurringPayments` (FR-REC-1) found repeating, what each typically costs, and what
 * the whole commitment comes to per month.
 *
 * **Deliberately not filtered by the Explore date range.** Cadence only exists across time: a
 * one-month range cannot contain three monthly occurrences, so range-scoping the detector would
 * make it find nothing. The panel says so in its own caption rather than leaving a reader to
 * conclude the page's range is broken.
 *
 * A real `<table>` with a caption, not a chart — so the accessible rendering *is* the UI and no
 * `sr-only` mirror (the TICKET-STAT-20 convention for canvas charts) applies here. Amounts blur
 * under privacy mode via `mm-privacy-blur`, which works because every one of them is visible text.
 */
@Component({
  selector: 'app-recurring-payments-panel',
  imports: [
    NgTemplateOutlet,
    BadgeComponent,
    ButtonComponent,
    EmptyStateComponent,
    FlexComponent,
    PaperComponent,
    PrivacyBlurComponent,
    TableComponent,
    TypographyComponent,
  ],
  templateUrl: './recurring-payments-panel.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RecurringPaymentsPanelComponent {
  private readonly categoriesStore = inject(CategoriesStore);
  private readonly appSettingsStore = inject(AppSettingsStore);

  /** Shared with the bills calendar below, so detection runs once per page rather than once per section. */
  private readonly recurringSeriesStore = inject(RecurringSeriesStore);

  protected readonly privacyMode = this.appSettingsStore.privacyModeEnabled;

  /** Which series have their occurrences unfolded. Component-local: it is a reading aid, not state anything else needs. */
  private readonly expandedKeys = signal<ReadonlySet<string>>(new Set());

  /**
   * Already sorted most-expensive-first by the aggregate, which owns that order; this only turns
   * each series into display facts. Reads `formatCurrency`/`formatDate`, so it re-derives when the
   * locale or currency setting changes — and deliberately *not* when a row is expanded, which is
   * why `expanded` is stitched on by the cheap `rows` map below rather than resolved here.
   */
  private readonly formattedRows = computed<
    Omit<RecurringSeriesRow, 'expanded' | 'expandIcon' | 'toggleAriaLabel'>[]
  >(() => {
    const categoriesById = this.categoriesStore.categoriesById();
    const privacyMode = this.privacyMode();

    return this.recurringSeriesStore.series().map((series) => {
      const category =
        series.categoryId != null ? categoriesById.get(series.categoryId) : undefined;

      return {
        key: series.key,
        label: series.label,
        categoryName: category?.name ?? UNCATEGORISED_LABEL,
        categoryColor: category?.color ?? CHART_NO_COLOR_FALLBACK,
        cadence: CADENCE_LABELS[series.cadence],
        typicalAmount: formatCurrency(series.typicalAmount),
        lastDate: formatDate(series.lastDate),
        nextExpectedDate: formatDate(series.nextExpectedDate),
        monthlyEquivalent: formatCurrency(series.monthlyEquivalent),
        occurrenceCount: series.occurrences.length,
        occurrences: series.occurrences.map((occurrence) => ({
          transactionId: occurrence.transactionId,
          date: formatDate(occurrence.date),
          amount: formatCurrency(occurrence.amount),
        })),
        // A badge's amounts are baked into its text, so `mm-privacy-blur` can't reach them —
        // they are withheld at build time instead (TICKET-PRIV-01).
        badges: flagBadges(series.flags, privacyMode),
        stopped: series.flags.stopped !== undefined,
      };
    });
  });

  /** Stitches on the per-row disclosure facts, the only ones that change when a row is toggled. */
  protected readonly rows = computed<RecurringSeriesRow[]>(() => {
    const expandedKeys = this.expandedKeys();

    return this.formattedRows().map((row) => {
      const expanded = expandedKeys.has(row.key);
      return {
        ...row,
        expanded,
        expandIcon: expanded ? '▾' : '▸',
        toggleAriaLabel: `${expanded ? 'Hide' : 'Show'} the ${row.occurrenceCount} payments behind ${row.label}`,
      };
    });
  });

  /**
   * Live commitments and finished ones, listed apart (TICKET-REC-04) — a cancelled subscription
   * among the things you still pay for reads as something you still pay for.
   */
  protected readonly activeRows = computed(() => this.rows().filter((row) => !row.stopped));
  protected readonly stoppedRows = computed(() => this.rows().filter((row) => row.stopped));

  /** Off the shared series, not `rows()` — a count has no business re-deriving because a row was unfolded. */
  protected readonly seriesCount = computed(() => this.recurringSeriesStore.activeSeries().length);

  /** The summary sentence, resolved here so the template renders a string instead of pluralising one. */
  protected readonly summaryLabel = computed(() => {
    const count = this.seriesCount();
    return `${count} recurring ${count === 1 ? 'payment' : 'payments'} ≈`;
  });

  /**
   * Summed from the series' own monthly equivalents, so the total can never disagree with the column
   * above it — and over the **active** ones only: a stopped series costs nothing per month, and
   * including it would overstate the commitment the number exists to state (TICKET-REC-04).
   */
  protected readonly monthlyTotal = computed(() =>
    formatCurrency(
      this.recurringSeriesStore
        .activeSeries()
        .reduce((total, series) => total + series.monthlyEquivalent, 0),
    ),
  );

  protected toggle(key: string): void {
    this.expandedKeys.update((keys) => {
      const next = new Set(keys);
      if (!next.delete(key)) next.add(key);
      return next;
    });
  }
}
