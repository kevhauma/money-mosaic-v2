import type { Routes } from '@angular/router';
import { provideEchartsCore } from 'ngx-echarts';
import { echarts } from '@/shared/echarts';

export const ACCOUNTS_ROUTES: Routes = [
  {
    path: '',
    providers: [provideEchartsCore({ echarts })],
    children: [
      {
        path: '',
        loadComponent: () =>
          import('./components/accounts-overview/accounts-overview.component').then(
            (m) => m.AccountsOverviewComponent,
          ),
      },
      {
        path: ':id',
        loadComponent: () =>
          import('./components/accounts-detail/accounts-detail.component').then(
            (m) => m.AccountsDetailComponent,
          ),
      },
    ],
  },
];
