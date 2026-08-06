import type { Routes } from '@angular/router';
import { provideEchartsCore } from 'ngx-echarts';
import { echarts } from '@/shared/echarts';

export const EXPLORE_ROUTES: Routes = [
  {
    // A component-less grouping route, the shape `INCOME_ROUTES` established (TICKET-INC-18): the
    // overview renders straight into the shell's outlet, and any later section page added here
    // inherits the same provider scope instead of needing its own copy.
    path: '',
    // Route-level, like the Dashboard's, Accounts' and Income's — keeps echarts in this feature's
    // lazy chunk instead of the main bundle (TICKET-PERF-01), and it's what `NgxEchartsDirective`
    // resolves `NGX_ECHARTS_CONFIG` from, so this page's charts can't render without it.
    providers: [provideEchartsCore({ echarts })],
    children: [
      {
        path: '',
        loadComponent: () =>
          import('./components/explore-overview/explore-overview.component').then(
            (m) => m.ExploreOverviewComponent,
          ),
      },
    ],
  },
];
