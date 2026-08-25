import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';
import { type RecurringCadence, type RecurringConfidence } from '@/core/stats';
import { AppSettingsStore, CategoriesStore } from '@/core/state';
import { CHART_NO_COLOR_FALLBACK } from '@/shared/echarts';
import {
  AlertComponent,
  BadgeComponent,
  type BadgeColor,
  type BadgeVariant,
  ButtonComponent,
  EmptyStateComponent,
  FlexComponent,
  LoadingSkeletonComponent,
  PaperComponent,
  PrivacyBlurComponent,
  TableComponent,
  TypographyComponent,
} from '@/shared/ui';
import { formatCurrency, formatDate } from '@/shared/utils';
import { RecurringSeriesStore } from '../../recurring-series.store';
import {
  RecurringDismissedListComponent,
  type DismissedRow,
} from '../recurring-dismissed-list/recurring-dismissed-list.component';
import type { RecurringSeriesRow } from '../../recurring-payments-row-vm';

const UNCATEGORISED_LABEL = 'Uncategorised';

/** Cadence as a word, since "quarterly" is a rhythm the user reads, not an enum they decode. */
const CADENCE_LABELS: Record<RecurringCadence, string> = {
  weekly: 'Weekly',
  fortnightly: 'Fortnightly',
  monthly: 'Monthly',
  quarterly: 'Quarterly',
  yearly: 'Yearly',
};

/**
 * How each confidence level reads on a row (TICKET-REC-11). Words rather than a percentage: the
 * signals behind the score are uncalibrated heuristics, and "71%" would claim a precision the
 * detector does not have. The strong one is deliberately quiet — outline, no colour — so the page
 * does not shout at the reader about the rows that are fine.
 */
const CONFIDENCE_DISPLAY: Record<
  RecurringConfidence['level'],
  { label: string; color: BadgeColor | undefined; variant: BadgeVariant }
> = {
  high: { label: 'Strong match', color: undefined, variant: 'outline' },
  medium: { label: 'Fair match', color: 'warning', variant: 'outline' },
  low: { label: 'Weak match', color: 'warning', variant: 'soft' },
};

const confidenceTitle = (label: string, reason: string): string =>
  reason ? `${label} — ${reason}` : label;

/**
 * The Recurring page's payments section (FR-REC-2, TICKET-REC-02) — one list of every payment
 * `detectRecurringPayments` (FR-REC-1) found repeating, what each typically costs, and what the
 * whole commitment comes to per month.
 *
 * **Detected across the whole history, never a date range.** Cadence only exists across time: a
 * one-month range cannot contain three monthly occurrences, so range-scoping the detector would
 * make it find nothing. On `/explore` this had to be captioned as disobedience of that page's
 * range; on its own route it is simply how the page works, and the page says so once at the top
 * instead of each section apologising for itself.
 *
 * A real `<table>` with a caption, not a chart — so the accessible rendering *is* the UI and no
 * `sr-only` mirror (the TICKET-STAT-20 convention for canvas charts) applies here. Column amounts
 * blur under privacy mode via `mm-privacy-blur`, which works because they are visible text.
 *
 * **Seven columns, no Status column.** TICKET-REC-04's per-row flag badges — a price step, an
 * overdue payment, a stopped series — were removed from this table on request (2026-08-09). Two of
 * the three flags still reach the user by another route: a stopped series leaves the live list for
 * the collapsed "Stopped (n)" group (TICKET-REC-06) and counts toward nothing in the monthly total,
 * and an overdue expectation is still outlined on the bills calendar below and announced in its day
 * list. **`priceChange` is now shown nowhere.** All three remain computed on the series and are
 * covered by the aggregate's specs, so restoring any of them here is a template change.
 */
@Component({
  selector: 'app-recurring-payments-panel',
  imports: [
    NgTemplateOutlet,
    AlertComponent,
    BadgeComponent,
    ButtonComponent,
    EmptyStateComponent,
    FlexComponent,
    LoadingSkeletonComponent,
    PaperComponent,
    PrivacyBlurComponent,
    RecurringDismissedListComponent,
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
   * each series into display facts. Re-derives when the locale/currency setting changes (through
   * `formatCurrency`/`formatDate`) — but deliberately *not* when a row is expanded, which is why
   * `expanded` is stitched on by the cheap `rows` map below rather than resolved here, and no longer
   * when privacy mode changes: every amount this builds is visible text that `mm-privacy-blur`
   * reaches on its own, now that the badges baking amounts into a label are gone.
   */
  private readonly formattedRows = computed<
    Omit<RecurringSeriesRow, 'expanded' | 'expandIcon' | 'toggleAriaLabel'>[]
  >(() => {
    const categoriesById = this.categoriesStore.categoriesById();
    const mergeOverrideIdByKey = this.recurringSeriesStore.mergeOverrideIdByKey();

    return this.recurringSeriesStore.series().map((series) => {
      const category =
        series.categoryId != null ? categoriesById.get(series.categoryId) : undefined;
      const confidence = CONFIDENCE_DISPLAY[series.confidence.level];

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
        stopped: series.flags.stopped !== undefined,
        confidenceLabel: confidence.label,
        confidenceColor: confidence.color,
        confidenceVariant: confidence.variant,
        confidenceTitle: confidenceTitle(confidence.label, series.confidence.reason),
        dismissAriaLabel: `Dismiss ${series.label} — not a recurring payment`,
        mergeOverrideId: mergeOverrideIdByKey.get(series.key) ?? null,
        unmergeAriaLabel: `Undo the merge on ${series.label}`,
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

  /**
   * Whether the stopped group is unfolded (TICKET-REC-06). **Closed on every visit**, and
   * deliberately component-local and session-only — the same reading-aid status as `expandedKeys`,
   * so it is neither persisted to `appSettings` nor promoted to a store. A stopped series is kept
   * listed for life (REC-04), so this half of the table only ever grows: the panel should pay for
   * rendering it when asked, and lead with what the user still pays for otherwise.
   */
  private readonly stoppedGroupOpen = signal(false);

  /**
   * The stopped group's header as one set of display facts (TICKET-REC-06) — the count is in the
   * label so the *collapsed* state still says what it hides, and the glyph carries the state in
   * something other than colour.
   */
  protected readonly stoppedGroup = computed(() => {
    const count = this.stoppedRows().length;
    const open = this.stoppedGroupOpen();

    return {
      open,
      expandIcon: open ? '▾' : '▸',
      label: `Stopped (${count}) — no longer counted in the monthly total`,
      toggleAriaLabel: `${open ? 'Hide' : 'Show'} the ${count} stopped ${count === 1 ? 'payment' : 'payments'}`,
    };
  });

  protected toggleStoppedGroup(): void {
    this.stoppedGroupOpen.update((open) => !open);
  }

  /**
   * Whether the user's corrections have loaded (TICKET-REC-11). The page must not say "nothing
   * repeating found yet" while they are still in flight — that is an assertion of absence during a
   * load, the same claim TICKET-TRF-06 removed from the transfers panel.
   */
  protected readonly correctionsLoaded = this.recurringSeriesStore.overridesLoaded;

  /** Off the shared series, not `rows()` — a count has no business re-deriving because a row was unfolded. */
  protected readonly seriesCount = computed(() => this.recurringSeriesStore.activeSeries().length);

  /**
   * Why the list is shorter than the user's history (TICKET-REC-05) — `''` when nothing was left
   * out, so the template branches on emptiness rather than on a count. Says *what* was hidden and
   * *why*: a series silently gone is exactly the disappearance REC-04 refused to allow.
   */
  protected readonly concludedCaption = computed(() => {
    const count = this.recurringSeriesStore.concludedSeriesCount();
    // "series" is its own plural, so this needs no pluralisation branch — unlike `summaryLabel`.
    return count === 0
      ? ''
      : `${count} concluded series hidden — categories with an ended applicability range`;
  });

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

  /**
   * The detected series behind each rendered row, so a correction acts on the series rather than on
   * the row's display key — `RecurringPaymentSeries.key` is `<cluster>|<median amount>` and its own
   * doc forbids persisting it, so the store anchors an override on a transaction id instead
   * (TICKET-REC-11).
   */
  private readonly seriesByKey = computed(
    () => new Map(this.recurringSeriesStore.series().map((series) => [series.key, series])),
  );

  /**
   * Rows that look like the same payment listed twice (TICKET-REC-11) — the review's own case was
   * FreshMarket appearing as two monthly payments. Offered as a suggestion above the table, never
   * merged automatically: the app does not know these are one payment, only that they are the shape
   * of thing that usually is.
   */
  protected readonly mergeSuggestions = computed(() =>
    this.recurringSeriesStore.mergeCandidates().map((pair) => ({
      primaryKey: pair.primary.key,
      duplicateKey: pair.duplicate.key,
      label: pair.primary.label,
      // The two amounts are kept out of the sentence and blurred on their own (TICKET-PRIV-01):
      // baking them into prose would either leak them under privacy mode or, if the whole sentence
      // were blurred, hide the explanation along with the figures — which TICKET-STAT-42 forbids.
      leadText: `${pair.primary.label} is listed twice —`,
      primaryAmount: formatCurrency(pair.primary.typicalAmount),
      duplicateAmount: formatCurrency(pair.duplicate.typicalAmount),
      trailText: ', same category.',
      mergeAriaLabel: `Merge the two ${pair.primary.label} payments into one`,
    })),
  );

  /**
   * Dismissed detections, kept visible behind a disclosure rather than deleted (TICKET-REC-11). A
   * dismissal the user cannot see or undo would be the same automation problem in the other
   * direction — the page would now be silently *hiding* something instead of silently asserting it.
   */
  protected readonly dismissedRows = computed<DismissedRow[]>(() =>
    this.recurringSeriesStore.dismissedSeries().map(({ series, overrideId }) => ({
      overrideId,
      label: series.label,
      typicalAmount: formatCurrency(series.typicalAmount),
      restoreAriaLabel: `Restore ${series.label} to the recurring payments list`,
    })),
  );

  protected dismiss(key: string): void {
    const series = this.seriesByKey().get(key);
    if (series) void this.recurringSeriesStore.dismissSeries(series);
  }

  protected merge(primaryKey: string, duplicateKey: string): void {
    const primary = this.seriesByKey().get(primaryKey);
    const duplicate = this.seriesByKey().get(duplicateKey);
    if (primary && duplicate) void this.recurringSeriesStore.mergeSeries(primary, duplicate);
  }

  /** Undoes a user merge — the same call as restoring a dismissal, since both remove an override. */
  protected unmerge(overrideId: number): void {
    void this.recurringSeriesStore.restoreOverride(overrideId);
  }

  protected restore(overrideId: number): void {
    void this.recurringSeriesStore.restoreOverride(overrideId);
  }

  protected toggle(key: string): void {
    this.expandedKeys.update((keys) => {
      const next = new Set(keys);
      if (!next.delete(key)) next.add(key);
      return next;
    });
  }
}
