import type { Routes } from '@angular/router';
import { provideEchartsCore } from 'ngx-echarts';
import { echarts } from '@/shared/echarts';

export const FUTURE_ROUTES: Routes = [
  {
    // A component-less grouping route, the shape `INCOME_ROUTES`/`EXPLORE_ROUTES` established: the
    // overview renders straight into the shell's outlet, and any later section added here inherits
    // the same provider scope instead of needing its own copy.
    path: '',
    // Route-level, like the Dashboard's, Accounts', Income's and Explore's — keeps echarts in this
    // feature's lazy chunk instead of the main bundle (TICKET-PERF-01), and it's what
    // `NgxEchartsDirective` resolves `NGX_ECHARTS_CONFIG` from. Declared here by TICKET-FUT-03 so
    // TICKET-FUT-07's projected net-worth chart adds no provider wiring of its own.
    providers: [provideEchartsCore({ echarts })],
    children: [
      {
        path: '',
        loadComponent: () =>
          import('./components/future-overview/future-overview.component').then(
            (m) => m.FutureOverviewComponent,
          ),
      },
    ],
  },
];
