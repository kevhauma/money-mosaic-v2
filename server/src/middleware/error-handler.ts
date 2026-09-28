import type { ErrorRequestHandler, RequestHandler } from 'express';

/**
 * Every failure the client sees. `code` is present only where a route chose one — see `httpError` —
 * and is the field a client may branch on; `error` is prose for a human.
 */
export type ErrorBody = { readonly error: string; readonly code?: string };

/**
 * An error carrying the HTTP status a route wants to answer with.
 *
 * `clientCode` rather than `code`, because `code` is not a field only our own errors have: Node and
 * better-sqlite3 both populate it (`ECONNABORTED`, `SQLITE_CONSTRAINT_UNIQUE`), and `express.json()`
 * is mounted app-wide — body-parser answers 400 for an aborted or malformed body while passing the
 * underlying stream error's `code` straight through. A distinct name nobody else writes is what makes
 * "only a route that chose a code has one" true rather than merely intended.
 */
export type HttpError = Error & { status?: number; statusCode?: number; clientCode?: string };

const statusOf = (error: unknown): number => {
  const candidate = (error as HttpError | null)?.status ?? (error as HttpError | null)?.statusCode;
  return typeof candidate === 'number' && candidate >= 400 && candidate <= 599 ? candidate : 500;
};

/**
 * A 4xx status is only ever set deliberately, by a route that chose both the code and the wording
 * — so its message is safe to show. A 5xx is whatever happened to be thrown, and that message can
 * carry a SQLite constraint ("UNIQUE constraint failed: users.email"), a filesystem path, or a SQL
 * fragment. The detail goes to the log; the client gets a generic line.
 */
const messageOf = (error: unknown, status: number): string => {
  if (status >= 500) return 'Internal server error';
  if (error instanceof Error && error.message !== '') return error.message;
  return 'Request failed';
};

/**
 * Same reasoning as `messageOf`: only what a route deliberately chose may reach the client. It reads
 * `clientCode` — the field only `httpError` writes — so a thrown object's own `code` can never be
 * echoed however it got its status. The 5xx check is belt-and-braces on top of that.
 */
const codeOf = (error: unknown, status: number): string | undefined => {
  if (status >= 500) return undefined;
  const candidate = (error as HttpError | null)?.clientCode;
  return typeof candidate === 'string' ? candidate : undefined;
};

/** Anything not matched by a route is JSON too — never an HTML page the client can't parse. */
export const notFoundHandler: RequestHandler = (req, res) => {
  const body: ErrorBody = { error: `No route for ${req.method} ${req.path}` };
  res.status(404).json(body);
};

/**
 * Turns a thrown error into `{ error: string }` instead of Express' default HTML stack page, so
 * every failure the client sees has the same shape as every success.
 */
export const createErrorHandler =
  (logError: (error: unknown) => void = console.error): ErrorRequestHandler =>
  // Express identifies an error handler by its arity — `next` is unused but load-bearing.
  (err, _req, res, _next) => {
    const status = statusOf(err);
    if (status >= 500) logError(err);

    const code = codeOf(err, status);
    const body: ErrorBody = {
      error: messageOf(err, status),
      ...(code === undefined ? {} : { code }),
    };
    res.status(status).json(body);
  };
