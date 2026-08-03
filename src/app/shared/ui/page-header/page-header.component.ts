import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { FlexComponent } from '../flex/flex.component';
import { TypographyComponent } from '../typography/typography.component';

/**
 * The one header every page opens with (TICKET-UI-22): the page title on the left, that page's
 * own page-level controls in two named slots, and nothing else.
 *
 * Renders as the app's top bar — daisyUI's `navbar`, the same treatment the shell topbar carried
 * before TICKET-UI-23 moved the range switcher out of it — full-bleed across the content area
 * rather than inset in the page's padding. A page therefore renders this at the top level of its
 * template, not inside a width-capped wrapper.
 *
 * "Page-level" means anything that reconfigures the whole page — date range, view switch,
 * create-new, show-archived, page settings, guide links, re-run. A control scoped to one panel
 * (a chart's bucket picker, say) stays on that panel. There is deliberately no `subtitle`: a page
 * that genuinely needs an explanatory sentence puts it in the body, where it belongs to the
 * content rather than to the chrome.
 *
 * **Which of the two slots (TICKET-UI-24).** A control that changes **what the page is showing** —
 * date range, view switch, back-to-parent — goes in `[actions-start]`, beside the title it
 * qualifies. A control that **acts on what is shown** — create, re-run, show-archived, page
 * settings, a link to somewhere else — goes in `[actions-end]`, right-aligned. Both groups wrap
 * independently, so a four-control header degrades to two rows on a phone rather than overflowing.
 *
 * **Sticky (TICKET-UI-25).** The bar is `sticky top-0 z-10`, so a long page's controls stay
 * reachable. Of the two options the ticket left open, this takes the second: the shell's mobile bar
 * stays in normal flow and scrolls away, and this header pins to the top of the viewport — the
 * drawer layout has no scroll container of its own to offset against, and a second sticky bar would
 * cost a phone a quarter of its viewport. `z-10` sits below the drawer's `z-20` (so the mobile menu
 * still covers the header) and far below daisyUI's `z-999` overlays. Themes that restyle `.navbar`
 * target `.mm-page-header-bar` to tell this bar from the shell's.
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
