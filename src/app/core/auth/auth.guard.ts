import { inject } from '@angular/core';
import { Router, type CanActivateFn, type GuardResult } from '@angular/router';
import { SessionStore } from './session.store';

/**
 * In front of every route except `/login` (TICKET-AUTH-02).
 *
 * On a hard refresh the session status is `unknown` — the cookie is `HttpOnly`, so the only way to
 * find out is to ask. Awaiting `restore()` here, rather than redirecting first and restoring
 * afterwards, is what stops a signed-in user's deep link from bouncing through the login screen.
 */
export const authGuard: CanActivateFn = async (_route, state): Promise<GuardResult> => {
  const session = inject(SessionStore);
  const router = inject(Router);

  if (session.status() === 'unknown') await session.restore();
  if (session.status() === 'authenticated') return true;

  // The attempted URL rides along so the login page can return to it instead of the dashboard.
  return router.createUrlTree(['/login'], { queryParams: { returnUrl: state.url } });
};
