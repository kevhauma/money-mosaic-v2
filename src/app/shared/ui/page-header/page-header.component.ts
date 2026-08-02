import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { FlexComponent } from '../flex/flex.component';
import { TypographyComponent } from '../typography/typography.component';

/**
 * The one header every page opens with (TICKET-UI-22): the page title on the left, that page's
 * own page-level controls in `[actions]` on the right, and nothing else.
 *
 * "Page-level" means anything that reconfigures the whole page — date range, view switch,
 * create-new, show-archived, page settings, guide links, re-run. A control scoped to one panel
 * (a chart's bucket picker, say) stays on that panel. There is deliberately no `subtitle`: a page
 * that genuinely needs an explanatory sentence puts it in the body, where it belongs to the
 * content rather than to the chrome.
 */
@Component({
  selector: 'mm-page-header',
  imports: [FlexComponent, TypographyComponent],
  templateUrl: './page-header.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PageHeaderComponent {
  readonly title = input.required<string>();
}
