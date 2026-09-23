import type { Request, Response } from 'express';

/** Cookie the session token rides in. */
export const SESSION_COOKIE = 'mm_session';

/**
 * A year. The `sessions` row has no expiry (see the schema), so a browser-session cookie would end
 * a session the server still considers live — closing the tab would silently sign you out. This
 * keeps the two lifetimes in step; logout is what ends a session.
 */
const COOKIE_MAX_AGE_MS = 365 * 24 * 60 * 60 * 1000;

/**
 * `secure` is deliberately absent: this server is plain HTTP on a LAN (TICKET-AUTH-01's non-goals),
 * and a `Secure` cookie would simply never be stored.
 */
const COOKIE_OPTIONS = { httpOnly: true, sameSite: 'lax', path: '/' } as const;

/**
 * Reads one cookie out of a raw `Cookie` header. Express does not parse cookies on its own and
 * `cookie-parser` would be a dependency for six lines; unlike password hashing there is nothing
 * subtle to get wrong here.
 */
export const readCookie = (header: string | undefined, name: string): string | undefined => {
  if (header === undefined) return undefined;

  for (const part of header.split(';')) {
    const separator = part.indexOf('=');
    if (separator === -1) continue;
    if (part.slice(0, separator).trim() !== name) continue;

    const value = part.slice(separator + 1).trim();
    if (value === '') return undefined;

    try {
      return decodeURIComponent(value);
    } catch {
      // An invalid percent sequence (`mm_session=%zz`) makes `decodeURIComponent` throw. This runs
      // inside synchronous middleware, so the throw would surface as a 500 on an unauthenticated
      // request — and unauthenticated input would be able to write stack traces to the operator's
      // log. A cookie we cannot decode is a cookie we do not have.
      return undefined;
    }
  }
  return undefined;
};

/** The session token this request carries, if any. */
export const readSessionToken = (req: Request): string | undefined =>
  readCookie(req.headers.cookie, SESSION_COOKIE);

export const setSessionCookie = (res: Response, token: string): void => {
  res.cookie(SESSION_COOKIE, token, { ...COOKIE_OPTIONS, maxAge: COOKIE_MAX_AGE_MS });
};

export const clearSessionCookie = (res: Response): void => {
  res.clearCookie(SESSION_COOKIE, COOKIE_OPTIONS);
};
