import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { computeIncomeGrowth, lastCompleteBucketKey, type IncomeGrowthWindow } from '@/core/stats';
import { AppSettingsStore } from '@/core/state';
import { PrivacyBlurComponent, StatCardComponent, TypographyComponent } from '@/shared/ui';
import { IncomeCareerStartComponent } from '../income-career-start/income-career-start.component';
import { IncomeInferenceNoteComponent } from '../income-inference-note/income-inference-note.component';
import {
  bucketDateBoundaries,
  buildTransactionDrilldownParams,
  formatCurrency,
  formatDate,
  formatPercent,
} from '@/shared/utils';
import { INCOME_GRANULARITY } from '../../income-granularity';
import { IncomeStore } from '../../income.store';

/** Printed instead of a percentage when the comparison would be `±∞%` — nothing was earned in the window being compared against. */
/**
 * What a card shows where a percentage would go when there is nothing to compare against
 * (TICKET-INC-23). Words, not an em dash: a row of dashes is the app declining to say anything,
 * and the sub-label underneath already knows exactly what is missing.
 */
const NO_COMPARISON_YET = 'Not yet';

export type IncomeGrowthCardVm = {
  label: string;
  value: string;
  subLabel: string;
  tooltip: string;
  color: 'success' | 'error' | undefined;
  /**
   * `/transactions` filtered to this card's **baseline** window (TICKET-INC-15), or `undefined` in
   * the `—` state, where there is nothing to drill into. Deliberately the baseline rather than the
   * shared current month: that one is already named in the caption above, and the baseline is the
   * half of the comparison the user can't otherwise see.
   */
  link: string | undefined;
  queryParams: Record<string, string> | undefined;
};

/** Green for growth, red for a decline, default ink for flat or unknowable — the sign is the whole point of this figure. */
const growthColor = (pct: number | null): 'success' | 'error' | undefined => {
  if (pct === null || pct === 0) return undefined;
  return pct > 0 ? 'success' : 'error';
};

/**
 * One comparison rendered as display facts, kept pure so it's testable without TestBed. The
 * sub-label always names the window compared against, because "+8%" alone doesn't say against
 * what — and the two cards differ only in that.
 */
export const buildIncomeGrowthCard = (
  label: string,
  current: number,
  window: IncomeGrowthWindow | null,
  missingReason: string,
): IncomeGrowthCardVm => {
  if (window === null)
    return {
      label,
      value: NO_COMPARISON_YET,
      subLabel: missingReason,
      tooltip: '',
      color: undefined,
      link: undefined,
      queryParams: undefined,
    };

  return {
    label,
    value: window.pct === null ? NO_COMPARISON_YET : formatPercent(window.pct, 'signed'),
    subLabel: `${formatCurrency(window.total)} → ${formatCurrency(current)}`,
    tooltip: `${formatDate(window.from)} – ${formatDate(window.to)}: ${formatCurrency(window.total)}`,
    color: growthColor(window.pct),
    link: '/transactions',
    // Date range only, no category: `buildTransactionDrilldownParams` takes a single `categoryId`
    // while this figure sums the whole FR-INC-3 selection, so narrowing to one would misrepresent
    // the number on the card. The month is the honest filter; the page's own filters do the rest.
    queryParams: buildTransactionDrilldownParams({ from: window.from, to: window.to }),
  };
};

/**
 * Income growth-rate panel (FR-INC-5, TICKET-INC-05/INC-15): is the income actually rising, or was
 * that just one good month? Answers it three times over — against the first month on record, the
 * same month a year earlier, and the first month of this year, in that (oldest-baseline-first)
 * order — for the categories the user counts (FR-INC-3),
 * on the lump-sum-smoothed series (FR-INC-4 and TICKET-INC-13's embedded-bonus pass) so a 13th month
 * can't masquerade as a raise or as a year-to-date jump.
 *
 * **Compares the last *complete* calendar month.** `IncomeStore.incomeRange` runs to today, so the
 * newest bucket is a part-month almost always, and a part-month against a whole one reads as a
 * collapse — the same refusal the yearly panel applies to a partial year.
 *
 * **No `mm-paper` of its own** (TICKET-INC-15): the cards render free-standing in the dashboard's
 * own stat-row shape, since both surfaces render the same component and used not to look like it.
 * The heading and the caption move above the row as page-level text rather than disappearing with
 * the wrapper — the caption is what makes both figures legible.
 */
@Component({
  selector: 'app-income-growth-panel',
  imports: [
    IncomeCareerStartComponent,
    IncomeInferenceNoteComponent,
    PrivacyBlurComponent,
    StatCardComponent,
    TypographyComponent,
  ],
  templateUrl: './income-growth-panel.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class IncomeGrowthPanelComponent {
  private readonly incomeStore = inject(IncomeStore);
  private readonly appSettingsStore = inject(AppSettingsStore);

  /** Drives the cards' `[blurred]` and the caption's wrapper (TICKET-PRIV-02). */
  protected readonly privacyMode = this.appSettingsStore.privacyModeEnabled;

  /** The newest month `incomeRange` fully covers, or `undefined` for a history with no complete month yet. */
  private readonly comparedMonth = computed(() =>
    lastCompleteBucketKey(
      this.incomeStore.incomeTrend().bucketKeys,
      INCOME_GRANULARITY,
      this.incomeStore.incomeRange().to,
    ),
  );

  private readonly growth = computed(() => {
    const month = this.comparedMonth();
    if (month === undefined) return null;
    const { start, end } = bucketDateBoundaries(month, INCOME_GRANULARITY);
    return computeIncomeGrowth(this.incomeStore.incomeTrend(), INCOME_GRANULARITY, start, end);
  });

  protected readonly hasComparableMonth = computed(() => this.growth() !== null);

  /**
   * e.g. "1 January 2026 – 31 January 2026, your last complete month: €3,200." Named in full so the
   * two deltas below are unambiguous.
   *
   * Split into the sentence and its figure (TICKET-PRIV-02) rather than left as one string: privacy
   * mode blurs the amount, and blurring the dates alongside it would hide *which* month the deltas
   * compare — the half of this caption that is a label rather than a figure.
   *
   * Empty strings rather than `null` for the no-comparison case: the template only reaches this
   * inside its `hasComparableMonth()` branch, and a nullable return would make it add a second `@if`
   * for a state it has already ruled out.
   */
  protected readonly caption = computed(() => {
    const growth = this.growth();
    return growth === null
      ? { text: '', amount: '' }
      : {
          text: `${formatDate(growth.from)} – ${formatDate(growth.to)}, your last complete month:`,
          amount: formatCurrency(growth.current),
        };
  });

  /**
   * Whether the career start is the user's own date or the app's guess (TICKET-INC-23). It matters
   * to the wording: with nothing set, `computeIncomeGrowth`'s baseline is the first month the
   * imported history happened to pay anything — which is not a career start, and labelling it as one
   * is the inference the old setup wall existed to prevent and did not.
   */
  private readonly careerStartIsSet = computed(() => !!this.incomeStore.careerStartDate());

  /** The sentence stating that assumption, beside the figure it produced. */
  protected readonly careerStartNote = computed(() => {
    const stored = this.incomeStore.careerStartDate();
    if (stored) return `Counting from ${formatDate(stored)}, the career start you set.`;

    const baseline = this.growth()?.careerStart;
    return baseline
      ? `No career start set, so this counts from ${formatDate(baseline.from)} — the first month your imported history paid anything.`
      : 'No career start set, so this counts from the first month your imported history paid anything.';
  });

  protected readonly cards = computed<IncomeGrowthCardVm[]>(() => {
    const growth = this.growth();
    if (growth === null) return [];
    // Chronological by *baseline*, oldest first: how far since I started, since last year, this
    // year. Reading them left to right is then reading the story forwards.
    return [
      buildIncomeGrowthCard(
        // Says what it actually compares against (TICKET-INC-23). "vs. start of career" is only
        // true once the user has told the app when that was; until then the baseline is the first
        // month the data pays anything, and claiming otherwise is how a meaningless 0% got read as
        // "no growth since I started working".
        this.careerStartIsSet() ? 'vs. start of career' : 'vs. your first month on record',
        growth.current,
        growth.careerStart,
        'no earlier month on record to compare against',
      ),
      buildIncomeGrowthCard(
        'vs. same month last year',
        growth.current,
        growth.priorYear,
        'no data from a year ago yet',
      ),
      buildIncomeGrowthCard(
        'vs. start of year',
        growth.current,
        growth.yearStart,
        'no earlier month this year to compare against',
      ),
    ];
  });
}
