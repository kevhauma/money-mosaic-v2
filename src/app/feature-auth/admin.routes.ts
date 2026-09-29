import type { Routes } from '@angular/router';

/**
 * `/admin/*` — the account-management pages (TICKET-AUTH-03), rendered inside the app shell and
 * behind `adminGuard` (see `app.routes.ts`).
 *
 * The page is reached through a **second** `loadComponent` rather than being imported here, unlike
 * `AUTH_ROUTES`' login page. Both route tables are loaded through the one `@/feature-auth` barrel, so
 * importing the component eagerly would put the admin panel — and the `@/shared/ui` barrel behind it
 * — into the chunk a signed-out visitor downloads for `/login`, which is meant to carry the form and
 * nothing else. A nested dynamic import keeps the panel in a chunk of its own.
 */
export const ADMIN_ROUTES: Routes = [
  {
    path: 'users',
    title: 'User accounts',
    loadComponent: () =>
      import('./components/admin-users-page/admin-users-page.component').then(
        (m) => m.AdminUsersPageComponent,
      ),
  },
  // `/admin` on its own is not a page — there is one admin screen, and this is it.
  { path: '', pathMatch: 'full', redirectTo: 'users' },
];
