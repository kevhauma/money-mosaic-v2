import type { ErrorRequestHandler, RequestHandler } from 'express';

export type ErrorBody = { readonly error: string };

/** An error carrying the HTTP status a route wants to answer with. */
export type HttpError = Error & { status?: number; statusCode?: number };

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

    const body: ErrorBody = { error: messageOf(err, status) };
    res.status(status).json(body);
  };
