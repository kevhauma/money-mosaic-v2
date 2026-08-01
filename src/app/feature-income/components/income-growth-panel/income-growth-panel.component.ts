import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { computeIncomeGrowth, lastCompleteBucketKey, type IncomeGrowthWindow } from '@/core/stats';
import { PaperComponent, StatCardComponent, TypographyComponent } from '@/shared/ui';
import { bucketDateBoundaries, formatCurrency, formatDate, formatPercent } from '@/shared/utils';
import { INCOME_GRANULARITY } from '../../income-granularity';
import { IncomeStore } from '../../income.store';

/** Printed instead of a percentage when the comparison would be `±∞%` — nothing was earned in the window being compared against. */
const NO_PERCENT_SHOWN = '—';

export type IncomeGrowthCardVm = {
  label: string;
  value: string;
  subLabel: string;
  tooltip: string;
  color: 'success' | 'error' | undefined;
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
      value: NO_PERCENT_SHOWN,
      subLabel: missingReason,
      tooltip: '',
      color: undefined,
    };

  return {
    label,
    value: window.pct === null ? NO_PERCENT_SHOWN : formatPercent(window.pct, 'signed'),
    subLabel: `${formatCurrency(window.total)} → ${formatCurrency(current)}`,
    tooltip: `${formatDate(window.from)} – ${formatDate(window.to)}: ${formatCurrency(window.total)}`,
    color: growthColor(window.pct),
  };
};

/**
 * Income growth-rate panel (FR-INC-5, TICKET-INC-05): is the income actually rising, or was that
 * just one good month? Answers it twice over — against the month before, and against the same month
 * a year earlier — for the categories the user counts (FR-INC-3), on the lump-sum-smoothed series
 * (FR-INC-4) so a 13th month can't masquerade as a raise.
 *
 * **Compares the last *complete* calendar month.** `IncomeStore.incomeRange` runs to today, so the
 * newest bucket is a part-month almost always, and a part-month against a whole one reads as a
 * collapse — the same refusal the yearly panel applies to a partial year.
 *
 * A month is a short window to judge growth on, which is exactly why both comparisons are shown: a
 * one-off good month moves the month-over-month figure and leaves the year-over-year one alone.
 */
@Component({
  selector: 'app-income-growth-panel',
  imports: [PaperComponent, StatCardComponent, TypographyComponent],
  templateUrl: './income-growth-panel.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class IncomeGrowthPanelComponent {
  private readonly incomeStore = inject(IncomeStore);

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

  /** e.g. "January 2026 — your last complete month." Named in full so the two deltas below are unambiguous. */
  protected readonly caption = computed(() => {
    const growth = this.growth();
    return growth === null
      ? ''
      : `${formatDate(growth.from)} – ${formatDate(growth.to)}, your last complete month: ${formatCurrency(growth.current)}`;
  });

  protected readonly cards = computed<IncomeGrowthCardVm[]>(() => {
    const growth = this.growth();
    if (growth === null) return [];
    return [
      buildIncomeGrowthCard(
        'vs. previous month',
        growth.current,
        growth.priorPeriod,
        'no earlier month to compare against',
      ),
      buildIncomeGrowthCard(
        'vs. same month last year',
        growth.current,
        growth.priorYear,
        'no data from a year ago yet',
      ),
    ];
  });
}
