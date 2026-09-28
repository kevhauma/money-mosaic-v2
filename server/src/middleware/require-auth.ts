import type { Request, RequestHandler } from 'express';

import { readSessionToken } from '../auth/cookies.js';
import { findSessionUser } from '../auth/sessions.js';
import type { DrizzleDb } from '../db.js';
import type { HttpError } from './error-handler.js';
import type { SessionUser } from '../types.js';

/**
 * One wording for every "you are not signed in" case. Deliberately *not* the login route's
 * wording: that one answers "those credentials were wrong", this one answers "you have no session
 * at all", and they are different questions.
 */
const UNAUTHENTICATED = 'Not signed in';

/**
 * The request with its session resolved. Express' `Request` is extended by assignment rather than
 * by `declare module` augmentation: a global augmentation would claim `req.authUser` exists on
 * every route in the app, including the ones that never ran this middleware.
 */
type AuthenticatedRequest = Request & { authUser?: SessionUser };

/**
 * The signed-in user for a request that came through `requireAuth`. Throws rather than returning
 * `undefined` — reaching this from a route that is not mounted behind the middleware is a wiring
 * bug, not a runtime condition to branch on.
 */
export const authUserOf = (req: Request): SessionUser => {
  const user = (req as AuthenticatedRequest).authUser;
  if (user === undefined) throw new Error('Route is not mounted behind requireAuth');
  return user;
};

/**
 * Resolves the session cookie to a user and puts it on the request, 401-ing otherwise. This is the
 * single chokepoint every authenticated `/api` route mounts behind (TICKET-SRV-03); `/api/health`,
 * login and logout are the only routes that do not.
 */
export const createRequireAuth =
  (db: DrizzleDb): RequestHandler =>
  (req, _res, next) => {
    const token = readSessionToken(req);
    const user = token === undefined ? undefined : findSessionUser(db, token);
    if (user === undefined) {
      const error: HttpError = new Error(UNAUTHENTICATED);
      error.status = 401;
      next(error);
      return;
    }

    (req as AuthenticatedRequest).authUser = user;
    next();
  };
