import type { Routes } from '@angular/router';

export const CHANGELOG_ROUTES: Routes = [
  {
    path: '',
    title: 'Changelog',
    loadComponent: () =>
      import('./components/changelog-page/changelog-page.component').then(
        (m) => m.ChangelogPageComponent,
      ),
  },
];
