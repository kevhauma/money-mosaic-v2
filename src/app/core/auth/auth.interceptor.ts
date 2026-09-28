import { HttpErrorResponse, type HttpInterceptorFn } from '@angular/common/http';
import { inject, Injector } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';
import {
  AUTH_LOGIN_URL,
  AUTH_ME_URL,
  AUTH_PASSWORD_URL,
  isApiUrl,
  isEndpoint,
  WRONG_CURRENT_PASSWORD_CODE,
} from './auth-endpoints';
import { SessionStore } from './session.store';

/**
 * A 401 from these two is *always* an answer, never an expired session, so the URL alone settles it:
 * `me` is how a signed-out visitor is *identified* as signed out (`SessionStore.restore()`), and
 * `login` is a rejected password, which the form reports inline. Both sit in front of the session
 * guard, so neither can answer 401 for any other reason — and redirecting on either would loop the
 * guard, or throw away the `returnUrl` the login page is holding.
 */
const ANSWERS_401_NORMALLY = [AUTH_ME_URL, AUTH_LOGIN_URL] as const;

/**
 * `POST /api/auth/password` is the one endpoint whose 401 means two different things (TICKET-AUTH-04):
 * "that is not your current password", which belongs inline on the Settings form, or "your session
 * expired while that form sat open", which has to sign the user out like any other expiry. Exempting
 * the URL outright would swallow the second case — leaving someone typing into a form backed by a
 * dead cookie, told only that they are "Not signed in", with nothing to make them sign in again — so
 * the route tags the first case with a `code` and only that code is exempt.
 */
const isWrongCurrentPassword = (url: string, error: HttpErrorResponse): boolean =>
  isEndpoint(url, AUTH_PASSWORD_URL) &&
  (error.error as { code?: unknown } | null)?.code === WRONG_CURRENT_PASSWORD_CODE;

/**
 * Whether this failure means the session is gone, as opposed to an endpoint answering a question
 * with a 401. Named rather than inlined into the `catchError` below: the whole decision the
 * interceptor makes is this one, and it reads as a list of conditions rather than as control flow.
 */
const isSessionExpired = (url: string, error: unknown): boolean =>
  error instanceof HttpErrorResponse &&
  error.status === 401 &&
  !isEndpoint(url, ...ANSWERS_401_NORMALLY) &&
  !isWrongCurrentPassword(url, error);

/**
 * Sends the session cookie with every `/api` call, and turns an expired session into a trip back
 * to the login screen (TICKET-AUTH-02).
 *
 * `Injector` rather than injecting the store and the router directly: this function runs in an
 * injection context for *every* request, and resolving `SessionStore` eagerly there would
 * construct it — and the `HttpClient` it depends on — from inside the very request being
 * intercepted.
 */
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const apiCall = isApiUrl(req.url);
  const injector = inject(Injector);

  // Same-origin through the dev proxy, so the cookie would ride along anyway — stated explicitly
  // so a deployment that puts the API on another origin keeps working instead of silently
  // signing everyone out. `isApiUrl` compares pathnames, so it recognises both URL shapes.
  const request = apiCall ? req.clone({ withCredentials: true }) : req;

  return next(request).pipe(
    catchError((error: unknown) => {
      if (apiCall && isSessionExpired(req.url, error)) {
        const session = injector.get(SessionStore);
        const router = injector.get(Router);

        // Once only. A page that fired several requests in parallel gets several 401s, and each
        // would otherwise clear the session and start its own navigation — cancelling the one
        // before it, and the last one recording a `returnUrl` of `/login` itself.
        if (session.status() !== 'anonymous') {
          // Captured before `clearSession`, and carried the same way the guard carries it — a
          // session that expires mid-session should come back to the page it interrupted, not to
          // the dashboard.
          const returnUrl = router.url;
          session.clearSession();
          void router.navigate(['/login'], { queryParams: { returnUrl } });
        }
      }
      return throwError(() => error);
    }),
  );
};
