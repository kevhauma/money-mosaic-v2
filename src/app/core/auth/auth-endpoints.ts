/**
 * The `/api/auth` endpoints, declared once because the interceptor has to recognise several of them
 * by URL: a 401 from `me`, `login` or `password` is an *answer*, not an expired session (see
 * `auth.interceptor.ts`). The first three are also the only endpoints a signed-out client may reach
 * (TICKET-AUTH-01).
 */
export const AUTH_LOGIN_URL = '/api/auth/login';
export const AUTH_LOGOUT_URL = '/api/auth/logout';
export const AUTH_ME_URL = '/api/auth/me';

/**
 * Self-service password change (TICKET-AUTH-04). Behind the session guard, and *unlike* `login` and
 * `me` its 401 is ambiguous: "that is not your current password" from the route itself, or "your
 * session expired" from the guard in front of it. So this URL is not exempt by URL — the
 * interceptor exempts it only when the body names the code below.
 */
export const AUTH_PASSWORD_URL = '/api/auth/password';

/**
 * The `code` the server puts on the wrong-current-password 401, mirroring
 * `WRONG_CURRENT_PASSWORD_CODE` in `server/src/routes/auth.ts`. Matched on rather than the message,
 * so rewording the sentence a user reads can never change which requests sign that user out.
 */
export const WRONG_CURRENT_PASSWORD_CODE = 'wrong_current_password';

/**
 * The admin panel's account management (TICKET-AUTH-03). Not exempt from anything in the
 * interceptor: a 401 here means exactly what it means everywhere else behind the session guard, and
 * its own refusals are 403s and 409s.
 */
export const ADMIN_USERS_URL = '/api/admin/users';

/** The `/api` prefix every backend route sits under. */
const API_PREFIX = '/api/';

/**
 * The path of a request URL, whatever shape it arrived in.
 *
 * `HttpRequest.url` is whatever the caller passed: the relative constants above today, but an
 * absolute URL the moment anything is configured for a deployment that serves the API from
 * another origin. Comparing raw strings would then match neither the `/api` prefix nor the two
 * exempt endpoints below — so the request would go out without its cookie *and* be treated as an
 * expired session when the 401 came back, which is an instant redirect loop.
 */
const pathOf = (url: string): string => {
  try {
    return new URL(url, document.baseURI).pathname;
  } catch {
    // Not a URL at all — compare it as given rather than claiming it is an API call.
    return url;
  }
};

/** Whether a request is bound for the backend, and so needs the session cookie. */
export const isApiUrl = (url: string): boolean => pathOf(url).startsWith(API_PREFIX);

/** Whether a request is for one of the named endpoints, whatever URL shape it used. */
export const isEndpoint = (url: string, ...endpoints: readonly string[]): boolean =>
  endpoints.includes(pathOf(url));
