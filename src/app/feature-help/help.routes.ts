import type { ResolveFn, Routes } from '@angular/router';
import { GUIDES } from './data/guides';

/**
 * The guide's own title, for the browser tab (TICKET-TXN-12). Resolvable here — unlike the account
 * and loan detail routes' — because `GUIDES` is a static module, so there is no store to hydrate
 * and nothing to await. An unknown slug yields no title and the tab falls back to the bare brand,
 * which matches what the page renders: its "guide not found" empty state.
 */
const guideTitle: ResolveFn<string> = (route) =>
  GUIDES.find((guide) => guide.slug === route.paramMap.get('slug'))?.title ?? '';

export const HELP_ROUTES: Routes = [
  {
    path: '',
    title: "How-to's",
    loadComponent: () =>
      import('./components/guides-index/guides-index.component').then(
        (m) => m.GuidesIndexComponent,
      ),
  },
  {
    // Listed before the ':slug' route below so the literal path always wins the match.
    path: 'faq',
    title: 'FAQ',
    loadComponent: () =>
      import('./components/faq-page/faq-page.component').then((m) => m.FaqPageComponent),
  },
  {
    path: ':slug',
    title: guideTitle,
    loadComponent: () =>
      import('./components/guide-detail/guide-detail.component').then(
        (m) => m.GuideDetailComponent,
      ),
  },
];
