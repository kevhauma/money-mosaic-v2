import { ChangeDetectionStrategy, Component, computed, effect, inject } from '@angular/core';
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
  tablerBuildingBank,
  tablerBulb,
  tablerDatabase,
  tablerFileImport,
  tablerHome,
  tablerMenu2,
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
import { STAT_QUERY_PARAMS } from '@/shared/utils';

const todayIso = (): string => new Date().toISOString().slice(0, 10);

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, RouterLink, RouterLinkActive, NgIcon, RangeGroupingSwitcherComponent],
  templateUrl: './app.html',
  styleUrl: './app.css',
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
    }),
  ],
})
export class App {
  protected readonly transactionsStore = inject(TransactionsStore);
  protected readonly accountsStore = inject(AccountsStore);
  protected readonly rangeStore = inject(RangeStore);

  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

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
}
