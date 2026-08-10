import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { tablerChartSankey, tablerFileImport } from '@ng-icons/tabler-icons';
import { pageRangeControl, RangeStore, TransactionsStore } from '@/core/state';
import {
  ButtonComponent,
  EmptyStateComponent,
  PageHeaderComponent,
  PaperComponent,
  RangeGroupingSwitcherComponent,
  TypographyComponent,
} from '@/shared/ui';
import { MoneyFlowPanelComponent } from '../money-flow-panel/money-flow-panel.component';

/**
 * The `/explore` page container (FR-EXP-1, TICKET-EXP-01) — the home for the range-scoped sections
 * that need the whole page rather than a Dashboard row. One today: the money flow Sankey
 * (TICKET-EXP-02). "Explore" rather than "Money flow" so a later section doesn't make the page's
 * name a lie.
 *
 * Its date range is its own (`pageRangeControl('explore')`, TICKET-UI-23): narrowing the Dashboard
 * to last month leaves whatever span someone set up here alone, which is the point of the keyed
 * `RangeStore` rather than one global range. **A section that would not obey that range does not
 * belong on this page** — which is why the recurring payments panel (TICKET-REC-02) and the bills
 * calendar (TICKET-REC-03), both of which read the whole history by nature, moved to `/recurring`
 * and took `RecurringSeriesStore` with them.
 *
 * **No page-level store**, and now none of the "shared derivation" kind either. Per-chart session
 * state belongs to `ChartOptionsStore` and the page range to `RangeStore`.
 */
@Component({
  selector: 'app-explore-overview',
  imports: [
    NgIcon,
    ButtonComponent,
    EmptyStateComponent,
    MoneyFlowPanelComponent,
    PageHeaderComponent,
    PaperComponent,
    RangeGroupingSwitcherComponent,
    TypographyComponent,
  ],
  templateUrl: './explore-overview.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  viewProviders: [provideIcons({ tablerChartSankey, tablerFileImport })],
})
export class ExploreOverviewComponent {
  private readonly transactionsStore = inject(TransactionsStore);

  /** This page's own date range and its switcher wiring (TICKET-UI-23) — independent of the Dashboard's. */
  protected readonly range = pageRangeControl('explore');

  /**
   * The same branch the Dashboard takes (TICKET-STAT-22): gated on `hydrated()` so the empty state
   * is a statement about the database rather than a flash while it loads.
   */
  protected readonly hasNoTransactions = computed(
    () => this.transactionsStore.hydrated() && this.transactionsStore.transactions().length === 0,
  );

  private readonly rangeStore = inject(RangeStore);

  /**
   * There is data, just none in the chosen span. Each section self-hides when it has nothing to draw
   * (TICKET-EXP-02), which without this would leave the page blank below its own header and read as
   * a broken page rather than a narrow range. A plain date filter, deliberately — asking the
   * aggregate would mean computing the whole graph a second time to learn whether it is empty.
   */
  protected readonly hasNothingInRange = computed(() => {
    const from = this.rangeStore.from('explore');
    const to = this.rangeStore.to('explore');
    return !this.transactionsStore
      .transactions()
      .some(({ bookingDate }) => bookingDate >= from && bookingDate <= to);
  });
}
