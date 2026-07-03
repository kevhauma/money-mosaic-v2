import type { Routes } from '@angular/router';
import { provideEchartsCore } from 'ngx-echarts';
import { echarts } from './echarts-setup';

export const DASHBOARD_ROUTES: Routes = [
  {
    path: '',
    providers: [provideEchartsCore({ echarts })],
    loadComponent: () =>
      import('./components/dashboard-overview/dashboard-overview.component').then(
        (m) => m.DashboardOverviewComponent,
      ),
  },
];
