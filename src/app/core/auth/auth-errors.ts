import { HttpErrorResponse } from '@angular/common/http';

/** What the login form shows when the server answered, but with nothing we can quote. */
const GENERIC_MESSAGE = 'Sign-in failed. Please try again.';
/** What it shows when there was no answer at all — a stopped server, not a rejected password. */
const UNREACHABLE_MESSAGE = 'Cannot reach the server. Is it running?';

/**
 * The server's own `{ error }` wording for a failed `/api/auth` call, or `fallback` when there is
 * nothing quotable. A status of 0 always wins: it carries no body at all, and "cannot reach the
 * server" is a different problem from anything the caller could have typed.
 *
 * A plain function rather than a store method: it is pure string work, and the one case worth
 * getting right (status 0) is easiest to pin in a unit test.
 */
export const authErrorMessage = (error: unknown, fallback: string): string => {
  if (!(error instanceof HttpErrorResponse)) return fallback;
  if (error.status === 0) return UNREACHABLE_MESSAGE;
  // A 5xx body is never quotable either, even though it *is* `{ error }`-shaped: the server answers
  // every 5xx with the literal "Internal server error" (`createErrorHandler` withholds the real
  // message on purpose), and showing that on a form says nothing about the form. The caller's
  // fallback at least names which action failed.
  if (error.status >= 500) return fallback;
  const body: unknown = error.error;
  const message = (body as { error?: unknown } | null)?.error;
  return typeof message === 'string' && message !== '' ? message : fallback;
};

/**
 * The wording for a failed sign-in, which is deliberately identical server-side for a wrong
 * password, an unknown identifier and a disabled account (TICKET-AUTH-01) — so the client neither
 * rewrites it nor tries to tell those cases apart.
 */
export const signInErrorMessage = (error: unknown): string =>
  authErrorMessage(error, GENERIC_MESSAGE);
