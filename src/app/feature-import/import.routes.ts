import type { Routes } from '@angular/router';

export const IMPORT_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./components/import-wizard/import-wizard.component').then(
        (m) => m.ImportWizardComponent,
      ),
  },
];
