import type { Routes } from '@angular/router';

export const LEARNING_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./components/learning-overview/learning-overview.component').then(
        (m) => m.LearningOverviewComponent,
      ),
  },
];
