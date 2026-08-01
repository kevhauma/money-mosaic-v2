import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import type { Category } from '@/core/data-access';
import { detectIncomeStepChanges, type IncomeStepChange } from '@/core/stats';
import { CategoriesStore } from '@/core/state';
import { AlertComponent, ButtonComponent, type AlertStatus } from '@/shared/ui';
import { bucketDateBoundaries, formatCurrency, formatDate, formatPercent } from '@/shared/utils';
import { INCOME_GRANULARITY } from '../../income-granularity';
import { IncomeStore } from '../../income.store';

export type IncomeStepChangeCalloutVm = {
  /** Stable across re-derivations, so a dismissal survives an unrelated change to the data. */
  key: string;
  status: AlertStatus;
  message: string;
};

/** A raise is good news, a pay cut is something to notice — but neither is an error, so neither takes `alert-error`. */
const STATUS_BY_DIRECTION: Record<IncomeStepChange['direction'], AlertStatus> = {
  increase: 'success',
  decrease: 'warning',
};

const VERB_BY_DIRECTION: Record<IncomeStepChange['direction'], string> = {
  increase: 'increased',
  decrease: 'dropped',
};

/**
 * One detected step-change as user-facing copy, kept pure so it's testable without TestBed. Every
 * amount goes through `formatCurrency()` and every date through `formatDate()` — the symbol, its
 * position and the number/date locale are all user settings since TICKET-SET-03/04, so a hardcoded
 * `€` here would be wrong for anyone who changed them.
 */
export const buildStepChangeCallout = (
  change: IncomeStepChange,
  categoriesById: ReadonlyMap<number, Category>,
): IncomeStepChangeCalloutVm => {
  const name = categoriesById.get(change.categoryId)?.name ?? 'Income';
  const { start } = bucketDateBoundaries(change.changedAtBucketKey, INCOME_GRANULARITY);
  return {
    key: `${change.categoryId}:${change.changedAtBucketKey}`,
    status: STATUS_BY_DIRECTION[change.direction],
    message:
      `${name} ${VERB_BY_DIRECTION[change.direction]} ${formatPercent(Math.abs(change.pctChange))} ` +
      `around ${formatDate(start)} — from about ${formatCurrency(change.fromAvg)} to ${formatCurrency(change.toAvg)} a month.`,
  };
};

/**
 * Raise / pay-cut callouts for the Income page (FR-INC-8, TICKET-INC-08): a sustained shift in what
 * an income category typically pays, surfaced above the trend chart instead of left for the user to
 * spot in it. Derived live from the stores in the shape of the dashboard's action-queue panel —
 * nothing is persisted, and the whole component renders nothing when there's nothing to say.
 *
 * Reads `IncomeStore.incomeTrend()`, so the detector sees the same smoothed, selection-scoped series
 * the chart draws: a category the user marked as an annual lump sum (FR-INC-4) arrives spread across
 * its year and its bonus month can't masquerade as a raise.
 *
 * Dismissal is **per visit**, not persisted: these callouts are a re-derivable reading of the data,
 * not a task list, so there is no state worth a schema change — dismissing one clears it from view
 * and it returns on the next load, the same as any other derived notice on the dashboard.
 */
@Component({
  selector: 'app-income-step-changes',
  imports: [AlertComponent, ButtonComponent],
  templateUrl: './income-step-changes.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class IncomeStepChangesComponent {
  private readonly categoriesStore = inject(CategoriesStore);
  private readonly incomeStore = inject(IncomeStore);

  private readonly dismissed = signal<ReadonlySet<string>>(new Set());

  protected readonly callouts = computed<IncomeStepChangeCalloutVm[]>(() => {
    const categoriesById = this.categoriesStore.categoriesById();
    const dismissed = this.dismissed();
    return detectIncomeStepChanges(this.incomeStore.incomeTrend(), INCOME_GRANULARITY)
      .map((change) => buildStepChangeCallout(change, categoriesById))
      .filter((callout) => !dismissed.has(callout.key));
  });

  protected dismiss(key: string): void {
    this.dismissed.update((dismissed) => new Set(dismissed).add(key));
  }
}
