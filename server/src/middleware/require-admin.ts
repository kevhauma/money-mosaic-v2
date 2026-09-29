import type { RequestHandler } from 'express';

import { httpError } from '../http/errors.js';
import { authUserOf } from './require-auth.js';

/** One wording for every "you are signed in, but this is not yours to do" case. */
const FORBIDDEN = 'This is an administrator-only action';

/**
 * Layered **behind** `requireAuth`: the session is already resolved, so this only asks what the
 * signed-in user is allowed to do (TICKET-AUTH-03). Every `/api/admin` endpoint mounts behind it,
 * so managing accounts is refused on the server rather than merely hidden in a nav the client
 * renders.
 *
 * A plain handler rather than a factory: unlike `requireAuth` it reads no database — the role
 * arrived on the session — so there is nothing to close over. `authUserOf` throws if this is
 * mounted without `requireAuth` in front of it, which is a wiring bug and not a 403.
 *
 * 403 rather than 404: the endpoint exists and the caller is known, which is exactly the case the
 * entity API's "everything unowned is a 404" rule is not about — that rule hides *whose* row an id
 * names, and `/api/admin/users` names no row.
 */
export const requireAdmin: RequestHandler = (req, _res, next) => {
  if (authUserOf(req).role !== 'admin') {
    next(httpError(403, FORBIDDEN));
    return;
  }
  next();
};
