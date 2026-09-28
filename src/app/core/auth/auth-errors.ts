import { HttpErrorResponse } from '@angular/common/http';

/** What the login form shows when the server answered, but with nothing we can quote. */
const GENERIC_MESSAGE = 'Sign-in failed. Please try again.';
/** What it shows when there was no answer at all — a stopped server, not a rejected password. */
const UNREACHABLE_MESSAGE = 'Cannot reach the server. Is it running?';

/**
 * The server's own wording for a failed sign-in, which is deliberately identical for a wrong
 * password, an unknown identifier and a disabled account (TICKET-AUTH-01) — so the client neither
 * rewrites it nor tries to tell those cases apart.
 *
 * A plain function rather than a store method: it is pure string work, and the one case worth
 * getting right (status 0, which carries no body) is easiest to pin in a unit test.
 */
export const signInErrorMessage = (error: unknown): string => {
  if (!(error instanceof HttpErrorResponse)) return GENERIC_MESSAGE;
  if (error.status === 0) return UNREACHABLE_MESSAGE;
  const body: unknown = error.error;
  const message = (body as { error?: unknown } | null)?.error;
  return typeof message === 'string' && message !== '' ? message : GENERIC_MESSAGE;
};
