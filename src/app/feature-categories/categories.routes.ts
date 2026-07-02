import type { Routes } from '@angular/router';

export const CATEGORIES_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./components/categories-overview/categories-overview.component').then(
        (m) => m.CategoriesOverviewComponent,
      ),
  },
  {
    path: 'rules',
    loadComponent: () =>
      import('./components/rules-overview/rules-overview.component').then(
        (m) => m.RulesOverviewComponent,
      ),
  },
];
