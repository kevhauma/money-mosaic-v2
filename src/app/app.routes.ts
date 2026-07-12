import { Routes } from '@angular/router';

export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'dashboard' },
  {
    path: 'dashboard',
    loadChildren: () => import('@/feature-dashboard').then((m) => m.DASHBOARD_ROUTES),
  },
  {
    path: 'accounts',
    loadChildren: () => import('@/feature-accounts').then((m) => m.ACCOUNTS_ROUTES),
  },
  {
    // Imported directly (not via the @/feature-transactions barrel) to avoid a circular import:
    // the lazy-loaded overview component pulls in AccountsStore, which imports TransactionsStore
    // from that same barrel.
    path: 'transactions',
    loadChildren: () =>
      import('./feature-transactions/transactions.routes').then((m) => m.TRANSACTIONS_ROUTES),
  },
  {
    path: 'import',
    loadChildren: () => import('@/feature-import').then((m) => m.IMPORT_ROUTES),
  },
  {
    path: 'categories',
    loadChildren: () => import('@/feature-categories').then((m) => m.CATEGORIES_ROUTES),
  },
  {
    path: 'learning',
    loadChildren: () => import('@/feature-learning').then((m) => m.LEARNING_ROUTES),
  },
];
