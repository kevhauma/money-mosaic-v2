import type { Routes } from '@angular/router';

export const SETTINGS_ROUTES: Routes = [
  {
    path: '',
    title: 'Settings',
    loadComponent: () =>
      import('./components/settings-overview/settings-overview.component').then(
        (m) => m.SettingsOverviewComponent,
      ),
  },
];
