import { HttpErrorResponse } from '@angular/common/http';

/**
 * Telling "the server did not answer" apart from "the server answered badly" (TICKET-SRV-06).
 *
 * The distinction is the whole ticket. A 4xx/5xx means the box is up and talking — the request was
 * refused, or it broke something, and the user should read the server's own words about it. A
 * *transport* failure means nothing answered at all: the server is off, restarting, or the address
 * changed. Only the second one is an outage, and only the second one may be retried blindly, since
 * a refused connection is the one failure that carries no information about what the server did.
 *
 * `HttpClient` reports both as `HttpErrorResponse`, separated only by `status === 0` — which is
 * exactly the kind of magic number that gets copied wrong, so it is written down once here.
 */

/** What the app shows when there was no answer at all. Matches `auth-errors.ts`'s wording. */
export const SERVER_UNREACHABLE_MESSAGE = 'Cannot reach the server. Is it running?';

/**
 * What `ApiClient` rejects with when a request never reached the server.
 *
 * `ApiClient` flattens every failure into a plain `Error` carrying the server's message, which is
 * right for a refusal and useless for an outage: the "message" of a status-0 response is
 * `Http failure response for /api/accounts: 0 Unknown Error`, which is both unreadable and
 * indistinguishable from a real answer once the `HttpErrorResponse` has been thrown away. A named
 * subclass keeps the one bit that matters — *nothing answered* — attached to the rejection all the
 * way up to the store that has to decide what to tell the user.
 */
export class ServerUnreachableError extends Error {
  constructor(message: string = SERVER_UNREACHABLE_MESSAGE) {
    super(message);
    this.name = 'ServerUnreachableError';
  }
}

/**
 * The HTTP status a failure carries, or `undefined` if it is not an HTTP failure at all.
 *
 * `instanceof` first, then the shape. The fallback is not defensive programming: `instanceof` is
 * identity *per copy of the class*, and anything that loads `@angular/common/http` twice — a test
 * runner pre-bundling the app's imports separately from the ones `FetchBackend` resolves, which is
 * exactly what happens under Vitest — produces an `HttpErrorResponse` that is one in every way
 * except that one. `name` is a fixed literal on the class, so it is a safer question than identity.
 *
 * Exported because it is the *only* answer to "did this come back from HTTP, and with what status?"
 * that this app is allowed to give. A second `instanceof HttpErrorResponse` elsewhere would be a
 * second answer, and under the dual-copy case above the two would disagree — see `ApiClient`.
 *
 * It cannot mistake an answer for an outage: it reports the status it finds, and only `0` is an
 * outage, so a duck-typed 500 stays a 500. `0` does also cover an aborted request and a CORS
 * rejection, which is accepted — from the client's side those are indistinguishable from "nothing
 * answered", which is what the banner says.
 */
export const httpStatusOf = (error: unknown): number | undefined => {
  if (error instanceof HttpErrorResponse) return error.status;

  const candidate = error as { name?: unknown; status?: unknown } | null;
  return candidate?.name === 'HttpErrorResponse' && typeof candidate.status === 'number'
    ? candidate.status
    : undefined;
};

/**
 * Whether this failure is an outage rather than an answer.
 *
 * Accepts both shapes deliberately: the raw `HttpErrorResponse` (what `AuthApiService` and the
 * interceptor see, since they sit above `ApiClient`) and the `ServerUnreachableError` a repository
 * rejects with. A caller should never have to know which tier its error came from to ask this.
 */
export const isTransportFailure = (error: unknown): boolean =>
  // `instanceof` is safe for this app's own class and not for `HttpErrorResponse`: the dual-copy
  // case above is about a *dependency* resolved twice by the test runner's pre-bundling, and Vite
  // dedupes first-party modules onto one instance.
  error instanceof ServerUnreachableError || httpStatusOf(error) === 0;
