import type { Routes } from '@angular/router';

export const TRANSACTIONS_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./components/transactions-overview/transactions-overview.component').then(
        (m) => m.TransactionsOverviewComponent,
      ),
  },
];
