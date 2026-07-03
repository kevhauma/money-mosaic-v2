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
  tablerFileImport,
  tablerHome,
  tablerMenu2,
  tablerTags,
} from '@ng-icons/tabler-icons';
import { type Granularity, RangeStore, type RangePreset } from '@/core/stats';
import { TransactionsStore } from '@/feature-transactions';
// Imported directly (not via the @/shared/ui barrel) to keep the rest of shared/ui — and the
// @angular/forms it drags in via InputComponent/SelectComponent — out of the eager bundle;
// Angular's @Component decorator has side effects, so esbuild can't tree-shake unused barrel
// re-exports once anything from the barrel is imported eagerly.
import {
  RangeGroupingSwitcherComponent,
  type RangeGroupingSwitcherValue,
} from '@/shared/ui/range-grouping-switcher/range-grouping-switcher.component';
import { STAT_QUERY_PARAMS } from '@/shared/utils';

const GRANULARITIES: Granularity[] = ['day', 'week', 'month', 'quarter'];
const isGranularity = (value: string | null): value is Granularity =>
  !!value && (GRANULARITIES as string[]).includes(value);

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
    }),
  ],
})
export class App {
  protected readonly transactionsStore = inject(TransactionsStore);
  protected readonly rangeStore = inject(RangeStore);

  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  protected readonly switcherValue = computed<RangeGroupingSwitcherValue>(() => ({
    preset: this.rangeStore.preset(),
    from: this.rangeStore.from(),
    to: this.rangeStore.to(),
    groupBy: this.rangeStore.groupBy(),
  }));

  constructor() {
    const initialParams = this.route.snapshot.queryParamMap;
    const from = initialParams.get(STAT_QUERY_PARAMS.from);
    const to = initialParams.get(STAT_QUERY_PARAMS.to);
    const groupBy = initialParams.get(STAT_QUERY_PARAMS.groupBy);

    if (from && to) {
      this.rangeStore.setCustomRange(from, to);
    }
    if (isGranularity(groupBy)) {
      this.rangeStore.setGroupBy(groupBy);
    }

    // Mirrors the range/grouping state back into the URL (FR-STAT-7 deep-linking) so Dashboard
    // and Transactions can read it regardless of which lazy route is currently active.
    effect(() => {
      const queryParams = {
        [STAT_QUERY_PARAMS.from]: this.rangeStore.from(),
        [STAT_QUERY_PARAMS.to]: this.rangeStore.to(),
        [STAT_QUERY_PARAMS.groupBy]: this.rangeStore.groupBy(),
      };
      void this.router.navigate([], {
        queryParams,
        queryParamsHandling: 'merge',
        replaceUrl: true,
      });
    });
  }

  protected onPresetChange(preset: RangePreset): void {
    this.rangeStore.setPreset(preset);
  }

  protected onCustomRangeChange({ from, to }: { from: string; to: string }): void {
    this.rangeStore.setCustomRange(from, to);
  }

  protected onGroupByChange(groupBy: Granularity): void {
    this.rangeStore.setGroupBy(groupBy);
  }
}
