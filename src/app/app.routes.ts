import { Routes } from '@angular/router';
import { homeRedirectGuard, markVisitedGuard } from '@/core/onboarding';

export const routes: Routes = [
  {
    // First-time visitor lands on the public landing page (TICKET-PUB-01); a returning visitor
    // (homeRedirectGuard sees the `mm-has-visited` flag already set) is redirected to /dashboard.
    path: '',
    pathMatch: 'full',
    canActivate: [homeRedirectGuard],
    loadChildren: () => import('@/feature-home').then((m) => m.HOME_ROUTES),
  },
  {
    // The landing page stays reachable at an explicit route even after the "seen it" flag is
    // set — linked from Settings rather than the primary sidebar nav.
    path: 'home',
    loadChildren: () => import('@/feature-home').then((m) => m.HOME_ROUTES),
  },
  {
    // The authenticated-app shell (drawer/sidebar/topbar) wraps every feature route below as a
    // lazy layout route — the landing page above is a sibling route rendered outside it.
    path: '',
    loadComponent: () => import('@/core/layout').then((m) => m.AppShellComponent),
    children: [
      {
        path: 'dashboard',
        canActivate: [markVisitedGuard],
        loadChildren: () => import('@/feature-dashboard').then((m) => m.DASHBOARD_ROUTES),
      },
      {
        path: 'accounts',
        loadChildren: () => import('@/feature-accounts').then((m) => m.ACCOUNTS_ROUTES),
      },
      {
        // Imported directly (not via the @/feature-transactions barrel). TICKET-SOLID-05 moved the
        // entity stores that used to create a cycle here (AccountsStore/TransactionsStore) into
        // core/state, so the barrel itself is cycle-free now — but this deep import is a deliberate,
        // already-decided exception per CLAUDE.md and stays as-is rather than being "fixed" back.
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
      {
        path: 'data',
        loadChildren: () =>
          import('@/feature-data-management').then((m) => m.DATA_MANAGEMENT_ROUTES),
      },
      {
        path: 'settings',
        loadChildren: () => import('@/feature-settings').then((m) => m.SETTINGS_ROUTES),
      },
    ],
  },
];
