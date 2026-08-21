import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { NgIcon, provideIcons } from '@ng-icons/core';
import {
  tablerArrowsExchange,
  tablerBook2,
  tablerBuildingBank,
  tablerBulb,
  tablerChartSankey,
  tablerFileImport,
  tablerHelpCircle,
  tablerHistory,
  tablerHome,
  tablerMenu2,
  tablerReceipt2,
  tablerRepeat,
  tablerSettings,
  tablerTags,
  tablerTargetArrow,
  tablerTrendingUp,
} from '@ng-icons/tabler-icons';
import { AppSettingsStore, TransactionsStore } from '@/core/state';
// Imported directly (not via the @/shared/ui barrel) to keep the rest of shared/ui — and the
// @angular/forms it drags in via InputComponent/SelectComponent — out of the eager bundle;
// Angular's @Component decorator has side effects, so esbuild can't tree-shake unused barrel
// re-exports once anything from the barrel is imported eagerly.
import { ButtonComponent } from '@/shared/ui/button/button.component';
import { TypographyComponent } from '@/shared/ui/typography/typography.component';

/** Sidebar nav item — default look is Deformable UI's soft rounded (not full-pill — TICKET-UI-21) primary tint on `.menu-active` (docs/v1.9_deformable_ui_redesign/design-language.md §7); the `mm-nav-item` marker is a theme-style hook other themes' scoped CSS restyles (every other theme sets its own `.mm-nav-item` radius, so this base class only governs the default theme). Defined once and bound identically to every nav `<a>` rather than repeating the same utility string per item. */
const NAV_ITEM_CLASS =
  'mm-nav-item rounded-field text-base-content/70 transition-colors [&.menu-active]:bg-primary/15 [&.menu-active]:text-primary [&.menu-active]:font-semibold';

/**
 * The authenticated-app shell (drawer/sidebar nav) wrapping every routed feature page. It owns no
 * date range: TICKET-UI-23 moved the switcher into the header of each page that has one, so
 * narrowing the Dashboard no longer re-scopes the Accounts chart.
 *
 * Rendered as a lazy layout route (`app.routes.ts`) around the existing feature
 * children — the landing page (TICKET-PUB-01, `feature-home`) is a sibling top-level route
 * rendered outside this shell entirely, since it's meant to look like a distinct "before you're
 * in the app" page, not just another tab inside the drawer.
 */
@Component({
  selector: 'app-shell',
  imports: [
    RouterOutlet,
    RouterLink,
    RouterLinkActive,
    NgIcon,
    ButtonComponent,
    TypographyComponent,
  ],
  templateUrl: './app-shell.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  viewProviders: [
    provideIcons({
      tablerMenu2,
      tablerHome,
      tablerTrendingUp,
      tablerRepeat,
      tablerChartSankey,
      tablerTargetArrow,
      tablerBuildingBank,
      tablerReceipt2,
      tablerFileImport,
      tablerArrowsExchange,
      tablerTags,
      tablerBulb,
      tablerBook2,
      tablerHelpCircle,
      tablerHistory,
      tablerSettings,
    }),
  ],
})
export class AppShellComponent {
  protected readonly transactionsStore = inject(TransactionsStore);
  // Unused otherwise — injecting it is the point. `AppSettingsStore` only hydrates and wires up
  // its settings-application effects (accent color, TICKET-SET-03's currency symbol/position) the
  // first time something injects it (`providedIn: 'root'` + onInit, TICKET-PERF-07); previously
  // nothing in the persistent app shell did, so those settings silently never applied outside of
  // whichever page load happened to visit /settings first.
  private readonly appSettingsStore = inject(AppSettingsStore);

  /** Mobile drawer open state — the toggle button and the checkbox-driven CSS drawer both read/write this. */
  protected readonly drawerOpen = signal(false);

  protected readonly navItemClass = NAV_ITEM_CLASS;

  protected onDrawerCheckboxChange(event: Event): void {
    this.drawerOpen.set((event.target as HTMLInputElement).checked);
  }
}
