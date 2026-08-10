import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { tablerTriangleFill, tablerTriangleInvertedFill } from '@ng-icons/tabler-icons/fill';
import {
  collectIncomeEvents,
  computeGrossNetRatio,
  detectIncomeGaps,
  detectIncomeStepChanges,
  detectWageChanges,
  groupIncomeEventsByYear,
  lastCompleteBucketKey,
} from '@/core/stats';
import { AppSettingsStore, CategoriesStore } from '@/core/state';
import {
  PaperComponent,
  PrivacyBlurComponent,
  TypographyComponent,
  DividerComponent,
} from '@/shared/ui';
import { buildIncomeEventYearVms, type IncomeEventYearVm } from '../../income-event-vm';
import { INCOME_GRANULARITY } from '../../income-granularity';
import { IncomeStore } from '../../income.store';

/**
 * The Income page's events rail (FR-INC-14, TICKET-INC-17): every raise, pay cut, recorded bonus and
 * income stream that went quiet, as one vertical timeline grouped by year, newest first — the same
 * ordering the salary-details table established for this page.
 *
 * Replaces the two dismissable banner stacks that used to sit above the trend chart. **Nothing here
 * is dismissable, and nothing is limited to what is recent**: the user reads these as history, not
 * as notices to clear, and an event log you can delete entries from is not a log. Dropping dismissal
 * is the point of the ticket rather than a side effect of moving the copy.
 *
 * Still **derived, never stored** — no event table, no detection-time write. Re-deriving means
 * correcting a mis-categorised transaction corrects the timeline too, which a stored log wouldn't.
 *
 * Each source keeps the series discipline its own requirement demands, which is why the merge takes
 * detected inputs rather than doing its own detection:
 * - step changes off `incomeTrend()` (smoothed), so an annual lump sum can't masquerade as a raise;
 * - gaps off `rawIncomeTrend()` (unsmoothed), because FR-INC-4's spreading would paint a non-zero
 *   amount over exactly the silence being looked for, and judged through the newest *complete*
 *   month, since a salary paid on the 25th is "missing" for three weeks of every month;
 * - bonuses straight off `salaryMetadataByMonth()`;
 * - month-on-month wage moves off `computeGrossNetRatio()`'s plain-salary basis, so a lump sum
 *   can't list as a raise and a cut two months apart.
 */
@Component({
  selector: 'app-income-events-sidebar',
  imports: [NgIcon, PaperComponent, PrivacyBlurComponent, TypographyComponent, DividerComponent],
  templateUrl: './income-events-sidebar.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  // The delta chip's pair, shared with the dashboard's period-comparison card. The only icons on
  // the rail: every row leads with its month instead, so a per-kind icon would be decoration.
  viewProviders: [provideIcons({ tablerTriangleFill, tablerTriangleInvertedFill })],
})
export class IncomeEventsSidebarComponent {
  private readonly categoriesStore = inject(CategoriesStore);
  private readonly incomeStore = inject(IncomeStore);
  private readonly appSettingsStore = inject(AppSettingsStore);

  /**
   * The rail is the densest run of figures on the page — every wage-change row carries a signed
   * amount, a level and a percentage, and every sentence quotes two amounts — so privacy mode has to
   * reach it (TICKET-PRIV-02), even though the ticket's acceptance criteria named only the panels.
   */
  protected readonly privacyMode = this.appSettingsStore.privacyModeEnabled;

  private readonly gaps = computed(() => {
    const trend = this.incomeStore.rawIncomeTrend();
    const through = lastCompleteBucketKey(
      trend.bucketKeys,
      INCOME_GRANULARITY,
      this.incomeStore.incomeRange().to,
    );
    return detectIncomeGaps(trend, INCOME_GRANULARITY, through);
  });

  /**
   * Month-on-month moves in take-home and gross pay, on the **plain-salary** basis: the annual
   * lump-sum categories are excluded and any recorded bonus subtracted, exactly as the "Net vs
   * gross" section does. A 13th month therefore never lists as a raise followed by a cut.
   */
  private readonly wageChanges = computed(() =>
    detectWageChanges(
      computeGrossNetRatio(
        this.incomeStore.rawIncomeTrend(),
        this.incomeStore.salaryMetadataByMonth(),
        this.incomeStore.smoothedBonusCategoryIds(),
      ),
    ),
  );

  protected readonly years = computed<IncomeEventYearVm[]>(() =>
    buildIncomeEventYearVms(
      groupIncomeEventsByYear(
        collectIncomeEvents(
          detectIncomeStepChanges(this.incomeStore.incomeTrend(), INCOME_GRANULARITY),
          this.gaps(),
          this.incomeStore.salaryMetadataByMonth().values(),
          this.wageChanges(),
        ),
      ),
      this.categoriesStore.categoriesById(),
    ),
  );

  protected readonly hasEvents = computed(() => this.years().length > 0);
}
