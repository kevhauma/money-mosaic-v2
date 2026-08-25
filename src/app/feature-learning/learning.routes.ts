import type { Routes } from '@angular/router';

export const LEARNING_ROUTES: Routes = [
  {
    path: '',
    title: 'Auto-categoriser',
    loadComponent: () =>
      import('./components/learning-overview/learning-overview.component').then(
        (m) => m.LearningOverviewComponent,
      ),
  },
];
