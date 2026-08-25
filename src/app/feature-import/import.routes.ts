import type { Routes } from '@angular/router';

export const IMPORT_ROUTES: Routes = [
  {
    path: '',
    title: 'Import CSV',
    loadComponent: () =>
      import('./components/import-wizard/import-wizard.component').then(
        (m) => m.ImportWizardComponent,
      ),
  },
];
