import type { Routes } from '@angular/router';

export const DATA_MANAGEMENT_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./components/data-management-overview/data-management-overview.component').then(
        (m) => m.DataManagementOverviewComponent,
      ),
  },
];
