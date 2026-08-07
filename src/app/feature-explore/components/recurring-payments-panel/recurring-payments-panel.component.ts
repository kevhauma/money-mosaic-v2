import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { detectRecurringPayments, type RecurringCadence } from '@/core/stats';
import { savingsAccountIbans } from '@/core/transfers';
import { AccountsStore, AppSettingsStore, CategoriesStore, TransactionsStore } from '@/core/state';
import { CHART_NO_COLOR_FALLBACK } from '@/shared/echarts';
import {
  ButtonComponent,
  EmptyStateComponent,
  FlexComponent,
  PaperComponent,
  PrivacyBlurComponent,
  TableComponent,
  TypographyComponent,
} from '@/shared/ui';
import { formatCurrency, formatDate } from '@/shared/utils';
import type { RecurringSeriesRow } from '../../recurring-payments-row-vm';

/** Today, read once per derivation — `detectRecurringPayments` stays clock-free, the way every other aggregate does. */
const todayIso = (): string => new Date().toISOString().slice(0, 10);

const UNCATEGORISED_LABEL = 'Uncategorised';

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
  private readonly transactionsStore = inject(TransactionsStore);
  private readonly categoriesStore = inject(CategoriesStore);
  private readonly accountsStore = inject(AccountsStore);
  private readonly appSettingsStore = inject(AppSettingsStore);

  protected readonly privacyMode = this.appSettingsStore.privacyModeEnabled;

  /** Which series have their occurrences unfolded. Component-local: it is a reading aid, not state anything else needs. */
  private readonly expandedKeys = signal<ReadonlySet<string>>(new Set());

  private readonly detected = computed(() =>
    detectRecurringPayments(
      this.transactionsStore.transactions(),
      this.categoriesStore.categoriesById(),
      this.accountsStore.accountsById(),
      todayIso(),
      savingsAccountIbans(this.accountsStore.accounts()),
    ),
  );

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

    return this.detected().series.map((series) => {
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

  /** Off `detected()`, not `rows()` — a count has no business re-deriving because a row was unfolded. */
  protected readonly seriesCount = computed(() => this.detected().series.length);

  /** The summary sentence, resolved here so the template renders a string instead of pluralising one. */
  protected readonly summaryLabel = computed(() => {
    const count = this.seriesCount();
    return `${count} recurring ${count === 1 ? 'payment' : 'payments'} ≈`;
  });

  /** Summed from the series' own monthly equivalents, so the total can never disagree with the column above it. */
  protected readonly monthlyTotal = computed(() =>
    formatCurrency(
      this.detected().series.reduce((total, series) => total + series.monthlyEquivalent, 0),
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
