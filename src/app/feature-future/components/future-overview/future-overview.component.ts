import { ChangeDetectionStrategy, Component } from '@angular/core';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { tablerTargetArrow } from '@ng-icons/tabler-icons';
import {
  EmptyStateComponent,
  PageHeaderComponent,
  PaperComponent,
  PrivacyToggleComponent,
  TypographyComponent,
} from '@/shared/ui';

/**
 * The `/future` page container (FR-FUT-3, TICKET-FUT-03) — the app's first forward-looking page,
 * and the stage TICKET-FUT-04's goals list, FUT-05's ETAs and FUT-07's projection render into.
 *
 * **This page has no date range, structurally.** It injects no `RangeStore` and renders no
 * switcher, because everything here looks forward from today; the *history* window that the
 * measured saving rate comes from is a per-section setting (TICKET-FUT-06), not a page range. That
 * is said out loud in the standfirst rather than left to be discovered, the way TICKET-REC-02 did
 * for the sections that never obeyed Explore's range.
 *
 * It sits in the sidebar's *Insights* group, so it carries `mm-privacy-toggle` from the start
 * (TICKET-PRIV-02) — the figures it will blur arrive with FUT-05.
 */
@Component({
  selector: 'app-future-overview',
  imports: [
    NgIcon,
    EmptyStateComponent,
    PageHeaderComponent,
    PaperComponent,
    PrivacyToggleComponent,
    TypographyComponent,
  ],
  templateUrl: './future-overview.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  viewProviders: [provideIcons({ tablerTargetArrow })],
})
export class FutureOverviewComponent {}
