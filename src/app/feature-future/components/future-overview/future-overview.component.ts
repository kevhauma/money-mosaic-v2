import { ChangeDetectionStrategy, Component } from '@angular/core';
import {
  PageHeaderComponent,
  PaperComponent,
  PrivacyToggleComponent,
  TypographyComponent,
} from '@/shared/ui';
import { GoalsPanelComponent } from '../goals-panel/goals-panel.component';

/**
 * The `/future` page container (FR-FUT-3, TICKET-FUT-03) — the app's first forward-looking page,
 * and the stage TICKET-FUT-04's goals list, FUT-05's ETAs and FUT-07's projection render into.
 * Each section owns its own empty state, so the page holds none of its own.
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
    GoalsPanelComponent,
    PageHeaderComponent,
    PaperComponent,
    PrivacyToggleComponent,
    TypographyComponent,
  ],
  templateUrl: './future-overview.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FutureOverviewComponent {}
