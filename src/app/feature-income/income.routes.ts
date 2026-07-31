import type { Routes } from '@angular/router';
import { provideEchartsCore } from 'ngx-echarts';
import { echarts } from '@/shared/echarts';

export const INCOME_ROUTES: Routes = [
  {
    path: '',
    // Route-level, like the Dashboard's and Accounts' — keeps echarts in this feature's lazy chunk
    // instead of the main bundle (TICKET-PERF-01), and it's what `NgxEchartsDirective` resolves
    // `NGX_ECHARTS_CONFIG` from, so the chart can't render without it (TICKET-INC-02).
    providers: [provideEchartsCore({ echarts })],
    loadComponent: () =>
      import('./components/income-overview/income-overview.component').then(
        (m) => m.IncomeOverviewComponent,
      ),
  },
];
