import type { Routes } from '@angular/router';

export const HOME_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./components/home-landing/home-landing.component').then(
        (m) => m.HomeLandingComponent,
      ),
  },
];
