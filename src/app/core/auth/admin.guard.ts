import { inject } from '@angular/core';
import { Router, type CanActivateFn, type GuardResult } from '@angular/router';
import { SessionStore } from './session.store';

/** Where a signed-in non-admin is sent instead — the page every account can see. */
const FALLBACK_URL = '/dashboard';

/**
 * In front of `/admin/*` (TICKET-AUTH-03). It **redirects rather than renders**: every endpoint the
 * admin panel calls answers a non-admin with 403, so letting the page mount would produce a screen
 * whose every request fails — an error report where the honest answer is "this is not yours to see".
 *
 * It restores an `unknown` session first, for the same reason `authGuard` does: the cookie is
 * `HttpOnly`, so on a hard refresh of a deep link the role is not known yet, and guessing would
 * bounce an admin off their own page. A signed-out visitor is sent to `/login` carrying the URL,
 * exactly as `authGuard` would — this guard sits on a child of the shell, so that case only arises
 * when it is used on its own.
 */
export const adminGuard: CanActivateFn = async (_route, state): Promise<GuardResult> => {
  const session = inject(SessionStore);
  const router = inject(Router);

  if (session.status() === 'unknown') await session.restore();

  if (session.status() !== 'authenticated')
    return router.createUrlTree(['/login'], { queryParams: { returnUrl: state.url } });

  return session.user()?.role === 'admin' ? true : router.createUrlTree([FALLBACK_URL]);
};
