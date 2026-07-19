import type { Routes } from '@angular/router';

export const SETTINGS_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./components/settings-overview/settings-overview.component').then(
        (m) => m.SettingsOverviewComponent,
      ),
  },
];
