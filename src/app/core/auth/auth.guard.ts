import { inject } from '@angular/core';
import { Router, type CanActivateFn, type GuardResult } from '@angular/router';
import { SessionStore } from './session.store';

/**
 * In front of every route except `/login` (TICKET-AUTH-02).
 *
 * On a hard refresh the session status is `unknown` — the cookie is `HttpOnly`, so the only way to
 * find out is to ask. Awaiting `restore()` here, rather than redirecting first and restoring
 * afterwards, is what stops a signed-in user's deep link from bouncing through the login screen —
 * including when the server is merely slow, since awaiting is the whole mechanism.
 */
export const authGuard: CanActivateFn = async (_route, state): Promise<GuardResult> => {
  const session = inject(SessionStore);
  const router = inject(Router);

  // The rejection is swallowed rather than handled here: `restore()` rejects only when nothing
  // answered (TICKET-SRV-06), and it leaves `status` at `'unknown'`, which the next line reads.
  if (session.status() === 'unknown') await session.restore().catch(() => undefined);

  // Still unknown means the server did not answer, so nobody knows whether this person is signed
  // in. Blocking the navigation leaves them where they are; sending them to `/login` would state —
  // wrongly, and unrecoverably, since that form needs the same server — that they are signed out.
  //
  // **Not reachable after a successful bootstrap**, and not meant to be: `provideAppInitializer`
  // resolves the session before anything renders, so by the time a guard runs the status is always
  // `authenticated` or `anonymous`, and an outage that starts mid-session is handled by the shell's
  // banner instead. This branch exists so that a future path which puts the status back to
  // `'unknown'` — a migration screen, a second `restore()` — fails visibly rather than redirecting
  // someone to a login form that cannot work. Note what it renders if it ever does fire: the guard
  // is on the shell route, so a cancelled navigation means no shell, no banner and a blank page.
  // Whoever makes it reachable owes it a `UrlTree` to something that explains itself.
  if (session.status() === 'unknown') return false;
  if (session.status() === 'authenticated') return true;

  // The attempted URL rides along so the login page can return to it instead of the dashboard.
  return router.createUrlTree(['/login'], { queryParams: { returnUrl: state.url } });
};
