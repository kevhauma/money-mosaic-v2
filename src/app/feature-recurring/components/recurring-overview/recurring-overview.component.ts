import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { tablerFileImport } from '@ng-icons/tabler-icons';
import { TransactionsStore } from '@/core/state';
import {
  ButtonComponent,
  EmptyStateComponent,
  PageHeaderComponent,
  PrivacyToggleComponent,
  TypographyComponent,
} from '@/shared/ui';
import { BillsCalendarComponent } from '../bills-calendar/bills-calendar.component';
import { RecurringPaymentsPanelComponent } from '../recurring-payments-panel/recurring-payments-panel.component';

/**
 * The `/recurring` page container — the home for the two sections that answer "what do I pay on a
 * rhythm, and what lands next": the recurring payments panel (FR-REC-2, TICKET-REC-02) and the
 * upcoming-bills calendar (FR-REC-3, TICKET-REC-03).
 *
 * Both used to sit at the bottom of `/explore`, where they never fitted: that page owns a date
 * range (`pageRangeControl('explore')`) and both of these deliberately ignore it, so each had to
 * caption its own disobedience. Given their own route they simply have no range to disobey — which
 * is why this page has **no `mm-range-grouping-switcher` and no `RangePageKey` of its own**, and why
 * `RECURRING_ROUTES` provides no echarts (neither section is a chart).
 *
 * **No page-level store beyond the shared derivation.** `RecurringSeriesStore` moved here with the
 * sections that read it — it holds the one detection both need, so it runs once per page rather than
 * once per section. Per-section session state (the calendar's visible month and view) stays in
 * `ChartOptionsStore` under the `recurring-bills-calendar` key.
 */
@Component({
  selector: 'app-recurring-overview',
  imports: [
    NgIcon,
    BillsCalendarComponent,
    ButtonComponent,
    EmptyStateComponent,
    PageHeaderComponent,
    PrivacyToggleComponent,
    RecurringPaymentsPanelComponent,
    TypographyComponent,
  ],
  templateUrl: './recurring-overview.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  viewProviders: [provideIcons({ tablerFileImport })],
})
export class RecurringOverviewComponent {
  private readonly transactionsStore = inject(TransactionsStore);

  /**
   * The same branch the Dashboard and Explore take (TICKET-STAT-22): gated on `hydrated()` so the
   * empty state is a statement about the database rather than a flash while it loads.
   */
  protected readonly hasNoTransactions = computed(
    () => this.transactionsStore.hydrated() && this.transactionsStore.transactions().length === 0,
  );
}
