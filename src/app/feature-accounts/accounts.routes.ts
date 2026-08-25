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
        title: 'Accounts',
        loadComponent: () =>
          import('./components/accounts-overview/accounts-overview.component').then(
            (m) => m.AccountsOverviewComponent,
          ),
      },
      {
        path: ':id',
        // The generic noun, not the account's name (TICKET-TXN-12): a title resolver runs before
        // the page does, and the name lives in `AccountsStore`, which may not have hydrated yet on
        // a cold load of this URL — so resolving it would mean either awaiting hydration in the
        // router or writing an empty string into the tab. The page's own `mm-page-header` still
        // shows the real name.
        title: 'Account',
        loadComponent: () =>
          import('./components/accounts-detail/accounts-detail.component').then(
            (m) => m.AccountsDetailComponent,
          ),
      },
    ],
  },
];
