import { HttpErrorResponse, type HttpInterceptorFn } from '@angular/common/http';
import { inject, Injector } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';
import { AUTH_LOGIN_URL, AUTH_ME_URL, isApiUrl, isEndpoint } from './auth-endpoints';
import { SessionStore } from './session.store';

/**
 * A 401 from these two is an answer, not an expired session: `me` is how a signed-out visitor is
 * *identified* as signed out (`SessionStore.restore()`), and `login` is a rejected password, which
 * the form reports inline. Redirecting on either would loop the guard, or throw away the
 * `returnUrl` the login page is holding.
 */
const ANSWERS_401_NORMALLY = [AUTH_ME_URL, AUTH_LOGIN_URL] as const;

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
      const sessionExpired =
        apiCall &&
        error instanceof HttpErrorResponse &&
        error.status === 401 &&
        !isEndpoint(req.url, ...ANSWERS_401_NORMALLY);

      if (sessionExpired) {
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
