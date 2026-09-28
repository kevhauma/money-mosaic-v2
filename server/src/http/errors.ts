import type { HttpError } from '../middleware/error-handler.js';

/**
 * The deliberate 4xx failures every `/api` route answers with (TICKET-SRV-03).
 *
 * Only a status set here reaches the client as written — `createErrorHandler` replaces the message
 * of anything 5xx with a generic line, precisely so a SQLite constraint failure ("UNIQUE
 * constraint failed: …", "FOREIGN KEY constraint failed") can never be answered with. A route that
 * wants to say something must therefore choose the status as well as the wording, which is what
 * these two helpers are.
 */

/**
 * An error carrying the status the route chose, for Express to hand to the error handler.
 *
 * The optional `code` is for the few failures a *client* has to branch on rather than merely
 * display. Wording is not a contract — it gets rephrased — and two routes can answer the same
 * status for entirely different reasons, which is exactly the case `code` exists for: a 401 from
 * `POST /api/auth/password` is either "wrong current password" or "your session expired", and the
 * interceptor has to sign the user out for one and not the other (TICKET-AUTH-04).
 */
export const httpError = (status: number, message: string, code?: string): HttpError => {
  const error: HttpError = new Error(message);
  error.status = status;
  // Written to `clientCode`, not `code` — see the `HttpError` doc comment: `code` is a field Node and
  // better-sqlite3 set on their own errors, so the response may only ever carry one a route chose.
  if (code !== undefined) error.clientCode = code;
  return error;
};

/**
 * One wording for "no such row", used for a row that does not exist **and** for one belonging to
 * another user — a deliberate 404 rather than a 403 (TICKET-SRV-03). It keeps every handler to a
 * single `where userId = ? and id = ?` with no second branch, and as a side effect the response
 * never confirms that someone else's id exists.
 */
export const notFound = (): HttpError => httpError(404, 'Not found');
