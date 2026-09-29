import { HttpEventType, type HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { of, retry, tap, throwError } from 'rxjs';
// Straight from the endpoints module rather than `@/core/auth`: that barrel exports the session
// store, the guards and the interceptor, none of which this needs, and `isApiUrl` is the one thing
// in the app that knows which URLs belong to the backend. `auth.interceptor.ts` imports it the same
// way for the same reason.
import { isApiUrl } from '../auth/auth-endpoints';
import { ServerStatusService } from './server-status.service';
import { isTransportFailure } from './transport-failure';

/**
 * Methods with no side effect, and so the only ones it is safe to fire twice (TICKET-SRV-06).
 *
 * A transport failure says the response never arrived — it does *not* say the request never landed.
 * Re-sending a `POST /api/transactions` on that evidence is how one import becomes two, so the
 * automatic retry is limited to reads. Every write that fails is the user's to retry, from a button
 * that tells them it failed.
 */
const SAFE_METHODS = ['GET', 'HEAD', 'OPTIONS'];

/**
 * Keeps `ServerStatusService` fed, and retries a read exactly once when nothing answered
 * (TICKET-SRV-06).
 *
 * An interceptor rather than a hook inside `ApiClient`: `/api/auth/me` is the request bootstrap
 * itself depends on, and it goes out through `AuthApiService`, which sits beside `ApiClient` rather
 * than under it. Putting the rule here means the one request that decides whether the app starts at
 * all is covered by the same code as the eighteen store hydrations.
 *
 * The single retry covers the common case this ticket was written for — the server having just
 * restarted, so the first request of the session hits a socket that is a few hundred milliseconds
 * from listening. Anything beyond one is the user pressing Retry: a silent retry loop against a box
 * that is switched off produces a UI that hangs instead of explaining itself, and a log nobody can
 * read.
 *
 * Registered *after* `authInterceptor`, so a retried request is re-sent below it — the session
 * cookie is already on the clone, and the 401 handling still sees only the final outcome.
 */
export const serverStatusInterceptor: HttpInterceptorFn = (req, next) => {
  if (!isApiUrl(req.url)) return next(req);

  const serverStatus = inject(ServerStatusService);

  return next(req).pipe(
    retry({
      count: SAFE_METHODS.includes(req.method) ? 1 : 0,
      // `of(0)` emits synchronously, so the retry is immediate rather than delayed. Re-throwing for
      // anything else is what keeps a 404 or a 500 from being asked twice: those are answers, and
      // asking again gets the same one.
      delay: (error: unknown) => (isTransportFailure(error) ? of(0) : throwError(() => error)),
    }),
    tap({
      next: (event) => {
        if (event.type === HttpEventType.Response) serverStatus.recordReachable();
      },
      error: (error: unknown) => serverStatus.recordFailure(error),
    }),
  );
};
