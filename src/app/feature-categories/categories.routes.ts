import type { Routes } from '@angular/router';

export const CATEGORIES_ROUTES: Routes = [
  {
    path: '',
    title: 'Categories',
    loadComponent: () =>
      import('./components/categories-overview/categories-overview.component').then(
        (m) => m.CategoriesOverviewComponent,
      ),
  },
  {
    path: 'rules',
    title: 'Rules',
    loadComponent: () =>
      import('./components/rules-overview/rules-overview.component').then(
        (m) => m.RulesOverviewComponent,
      ),
  },
];
