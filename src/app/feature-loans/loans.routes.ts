import type { Routes } from '@angular/router';

/**
 * No `provideEchartsCore` yet, unlike `ACCOUNTS_ROUTES`/`INCOME_ROUTES` — this page has no chart
 * until LOAN-07's balance-over-time chart lands. Add the provider (as a component-less grouping
 * route, the shape the other chart-bearing features use) at that point, not preemptively here.
 */
export const LOANS_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./components/loans-overview/loans-overview.component').then(
        (m) => m.LoansOverviewComponent,
      ),
  },
  {
    path: ':id',
    loadComponent: () =>
      import('./components/loan-detail/loan-detail.component').then((m) => m.LoanDetailComponent),
  },
];
