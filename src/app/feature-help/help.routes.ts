import type { Routes } from '@angular/router';

export const HELP_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./components/guides-index/guides-index.component').then(
        (m) => m.GuidesIndexComponent,
      ),
  },
  {
    // Listed before the ':slug' route below so the literal path always wins the match.
    path: 'faq',
    loadComponent: () =>
      import('./components/faq-page/faq-page.component').then((m) => m.FaqPageComponent),
  },
  {
    path: ':slug',
    loadComponent: () =>
      import('./components/guide-detail/guide-detail.component').then(
        (m) => m.GuideDetailComponent,
      ),
  },
];
