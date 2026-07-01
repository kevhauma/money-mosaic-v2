import type { Routes } from '@angular/router';

export const ACCOUNTS_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./components/accounts-overview.component').then((m) => m.AccountsOverviewComponent),
  },
  {
    path: ':id',
    loadComponent: () =>
      import('./components/accounts-detail.component').then((m) => m.AccountsDetailComponent),
  },
];
