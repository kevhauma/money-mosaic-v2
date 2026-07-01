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
];
