import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  signal,
} from '@angular/core';
import {
  ActivatedRoute,
  Router,
  RouterLink,
  RouterLinkActive,
  RouterOutlet,
} from '@angular/router';
import { NgIcon, provideIcons } from '@ng-icons/core';
import {
  tablerArrowsExchange,
  tablerBook2,
  tablerBuildingBank,
  tablerBulb,
  tablerFileImport,
  tablerHelpCircle,
  tablerHome,
  tablerMenu2,
  tablerSettings,
  tablerTags,
} from '@ng-icons/tabler-icons';
import { RangeStore, computeFullHistoryRange } from '@/core/stats';
import { AccountsStore, TransactionsStore } from '@/core/state';
// Imported directly (not via the @/shared/ui barrel) to keep the rest of shared/ui — and the
// @angular/forms it drags in via InputComponent/SelectComponent — out of the eager bundle;
// Angular's @Component decorator has side effects, so esbuild can't tree-shake unused barrel
// re-exports once anything from the barrel is imported eagerly.
import {
  RangeGroupingSwitcherComponent,
  type RangeGroupingPreset,
  type RangeGroupingSwitcherValue,
} from '@/shared/ui/range-grouping-switcher/range-grouping-switcher.component';
import { ButtonComponent } from '@/shared/ui/button/button.component';
import { TypographyComponent } from '@/shared/ui/typography/typography.component';
import { STAT_QUERY_PARAMS } from '@/shared/utils';

const todayIso = (): string => new Date().toISOString().slice(0, 10);

/** Sidebar nav item — default look is Deformable UI's soft rounded (not full-pill — TICKET-UI-21) primary tint on `.menu-active` (docs/v1.9_deformable_ui_redesign/design-language.md §7); the `mm-nav-item` marker is a theme-style hook other themes' scoped CSS restyles (every other theme sets its own `.mm-nav-item` radius, so this base class only governs the default theme). Defined once and bound identically to every nav `<a>` rather than repeating the same utility string per item. */
const NAV_ITEM_CLASS =
  'mm-nav-item rounded-field text-base-content/70 transition-colors [&.menu-active]:bg-primary/15 [&.menu-active]:text-primary [&.menu-active]:font-semibold';

/**
 * The authenticated-app shell (drawer/sidebar nav + topbar range switcher) wrapping every routed
 * feature page. Rendered as a lazy layout route (`app.routes.ts`) around the existing feature
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
    RangeGroupingSwitcherComponent,
    ButtonComponent,
    TypographyComponent,
  ],
  templateUrl: './app-shell.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  viewProviders: [
    provideIcons({
      tablerMenu2,
      tablerHome,
      tablerBuildingBank,
      tablerFileImport,
      tablerArrowsExchange,
      tablerTags,
      tablerBulb,
      tablerDatabase,
      tablerBook2,
      tablerHelpCircle,
      tablerSettings,
    }),
  ],
})
export class AppShellComponent {
  protected readonly transactionsStore = inject(TransactionsStore);
  protected readonly accountsStore = inject(AccountsStore);
  protected readonly rangeStore = inject(RangeStore);

  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  /** Mobile drawer open state — the toggle button and the checkbox-driven CSS drawer both read/write this. */
  protected readonly drawerOpen = signal(false);

  protected readonly navItemClass = NAV_ITEM_CLASS;

  protected readonly switcherValue = computed<RangeGroupingSwitcherValue>(() => ({
    preset: this.rangeStore.preset(),
    from: this.rangeStore.from(),
    to: this.rangeStore.to(),
  }));

  constructor() {
    const initialParams = this.route.snapshot.queryParamMap;
    const from = initialParams.get(STAT_QUERY_PARAMS.from);
    const to = initialParams.get(STAT_QUERY_PARAMS.to);

    if (from && to) {
      this.rangeStore.setCustomRange(from, to);
    }

    // Mirrors the range state back into the URL (FR-STAT-7 deep-linking) so Dashboard and
    // Transactions can read it regardless of which lazy route is currently active.
    effect(() => {
      const queryParams = {
        [STAT_QUERY_PARAMS.from]: this.rangeStore.from(),
        [STAT_QUERY_PARAMS.to]: this.rangeStore.to(),
      };

      // Skip navigating when the URL already mirrors this state — otherwise the initial
      // read-in triggers an immediate redundant navigation right after construction.
      const currentParams = this.route.snapshot.queryParamMap;
      const alreadyMirrored = Object.entries(queryParams).every(
        ([key, value]) => currentParams.get(key) === value,
      );
      if (alreadyMirrored) {
        return;
      }

      void this.router.navigate([], {
        queryParams,
        queryParamsHandling: 'merge',
        replaceUrl: true,
      });
    });
  }

  protected onPresetChange(preset: RangeGroupingPreset): void {
    if (preset === 'custom') {
      this.rangeStore.selectCustomPreset();
      return;
    }
    if (preset === 'all-time') {
      const range = computeFullHistoryRange(
        this.accountsStore.activeAccounts(),
        this.transactionsStore.transactions(),
        todayIso(),
      );
      this.rangeStore.setPreset(preset, range);
      return;
    }
    this.rangeStore.setPreset(preset);
  }

  protected onCustomRangeChange({ from, to }: { from: string; to: string }): void {
    this.rangeStore.setCustomRange(from, to);
  }

  protected onRangeShift(direction: -1 | 1): void {
    this.rangeStore.shiftRange(direction);
  }

  protected onDrawerCheckboxChange(event: Event): void {
    this.drawerOpen.set((event.target as HTMLInputElement).checked);
  }
}
