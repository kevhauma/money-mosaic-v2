/**
 * The three endpoints a signed-out client may reach (TICKET-AUTH-01). Declared once because the
 * interceptor has to recognise two of them by URL: a 401 from `me` or `login` is an *answer*, not
 * an expired session (see `auth.interceptor.ts`).
 */
export const AUTH_LOGIN_URL = '/api/auth/login';
export const AUTH_LOGOUT_URL = '/api/auth/logout';
export const AUTH_ME_URL = '/api/auth/me';

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
