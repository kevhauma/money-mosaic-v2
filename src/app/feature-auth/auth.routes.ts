import type { Routes } from '@angular/router';
import { LoginPageComponent } from './components/login-page/login-page.component';

/**
 * `/login` — the one route with no `authGuard` in front of it, and the one route outside the app
 * shell (TICKET-AUTH-02). Lazily loaded like every other feature, so a signed-out visitor
 * downloads the form and nothing else.
 *
 * The component is referenced directly rather than through a second `loadComponent`: reaching
 * this file at all means `app.routes.ts` already resolved the `@/feature-auth` barrel, which
 * re-exports the component — so a nested dynamic import would split a chunk that is already here.
 */
export const AUTH_ROUTES: Routes = [
  {
    path: '',
    title: 'Sign in',
    component: LoginPageComponent,
  },
];
