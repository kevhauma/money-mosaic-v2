import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import type { Category } from '@/core/data-access';
import { detectIncomeGaps, lastCompleteBucketKey, type IncomeGap } from '@/core/stats';
import { CategoriesStore } from '@/core/state';
import { AlertComponent } from '@/shared/ui';
import { bucketDateBoundaries, formatDate } from '@/shared/utils';
import { INCOME_GRANULARITY } from '../../income-granularity';
import { IncomeStore } from '../../income.store';

export type IncomeGapWarningVm = { key: string; message: string };

/**
 * One detected gap as user-facing copy, kept pure so it's testable without TestBed. The date goes
 * through `formatDate()` rather than a month name — the date locale is a user setting since
 * TICKET-SET-04, so an `en-US`-shaped "April 2026" would be wrong for anyone who changed it.
 */
export const buildGapWarning = (
  gap: IncomeGap,
  categoriesById: ReadonlyMap<number, Category>,
): IncomeGapWarningVm => {
  const name = categoriesById.get(gap.categoryId)?.name ?? 'An income category';
  const { start } = bucketDateBoundaries(gap.lastSeenBucketKey, INCOME_GRANULARITY);
  const months = gap.monthsMissing === 1 ? 'month' : 'months';
  return {
    key: `${gap.categoryId}:${gap.lastSeenBucketKey}`,
    message: `${name} hasn’t shown up since ${formatDate(start)} — ${gap.monthsMissing} ${months} with nothing, where it used to arrive most months.`,
  };
};

/**
 * Lost income stream warnings (FR-INC-9, TICKET-INC-09): a category that used to arrive like
 * clockwork and has gone quiet, surfaced above the trend chart rather than left to thin the growth
 * story unnoticed.
 *
 * Reads `IncomeStore.rawIncomeTrend()` — deliberately **not** the smoothed series the rest of the
 * page uses. FR-INC-4 spreads a real deposit across its year for display, which would paint a
 * non-zero amount over exactly the silence this is looking for.
 *
 * Judged through the newest *complete* month (`lastCompleteBucketKey`): the current month is in
 * progress, and a salary paid on the 25th is "missing" for three weeks of every month.
 */
@Component({
  selector: 'app-income-gap-warnings',
  imports: [AlertComponent],
  templateUrl: './income-gap-warnings.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class IncomeGapWarningsComponent {
  private readonly categoriesStore = inject(CategoriesStore);
  private readonly incomeStore = inject(IncomeStore);

  protected readonly warnings = computed<IncomeGapWarningVm[]>(() => {
    const trend = this.incomeStore.rawIncomeTrend();
    const through = lastCompleteBucketKey(
      trend.bucketKeys,
      INCOME_GRANULARITY,
      this.incomeStore.incomeRange().to,
    );
    const categoriesById = this.categoriesStore.categoriesById();
    return detectIncomeGaps(trend, INCOME_GRANULARITY, through).map((gap) =>
      buildGapWarning(gap, categoriesById),
    );
  });
}
