import type { Routes } from '@angular/router';

export const INCOME_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./components/income-overview/income-overview.component').then(
        (m) => m.IncomeOverviewComponent,
      ),
  },
];
