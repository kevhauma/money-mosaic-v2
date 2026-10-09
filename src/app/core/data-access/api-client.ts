import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { catchError, firstValueFrom, map, of, throwError, type Observable } from 'rxjs';
import { httpStatusOf, ServerUnreachableError } from '@/core/server-status';

/**
 * The one place a repository turns into an HTTP call (TICKET-SRV-05).
 *
 * Every repository in this folder used to wrap a browser-database table; each now wraps a route
 * of the API from TICKET-SRV-03/04. What they share is this client: the `/api` base path, the JSON
 * handling,
 * and — the reason it is one class rather than seventeen copies of `firstValueFrom` — a single
 * place that turns a failure response into a rejected promise carrying **the server's own
 * message**. A repository that built its own request would each have to remember that, and the one
 * that forgot would answer a 409 with `undefined`.
 *
 * Named `ApiClient` rather than `*Service`: it sits at the repository's tier, not a feature
 * service's, and like `*.repository.ts` it is infrastructure the stores never see. The session
 * cookie and the 401-to-`/login` trip are `authInterceptor`'s, which recognises a request by this
 * base path — so nothing here deals with authentication.
 */

/** The prefix every backend route sits under, and what `authInterceptor` matches on. */
const API_BASE = '/api';

/**
 * The `clientCode` the server puts on a "no such row" 404, mirroring `ROW_NOT_FOUND` in
 * `server/src/http/errors.ts`. Matched on rather than the status, since a path matching no route is
 * a 404 too — see `absent` below.
 */
const ROW_NOT_FOUND = 'row_not_found';

/**
 * The `code` off an error body, whichever form it arrived in.
 *
 * A request made with `responseType: 'arraybuffer'` — `getBytes`, for the trained model — gets its
 * *error* body as an `ArrayBuffer` too, even though the server sent the same JSON as everywhere
 * else. Without decoding it, the one endpoint that most needs "404 means there is no model" would
 * be the one endpoint that could not tell that from a mistyped URL.
 */
const codeOf = (error: HttpErrorResponse): string | undefined => {
  const body: unknown =
    error.error instanceof ArrayBuffer
      ? safeJson(new TextDecoder().decode(error.error))
      : error.error;
  const code = (body as { code?: unknown } | null)?.code;
  return typeof code === 'string' ? code : undefined;
};

const safeJson = (text: string): unknown => {
  try {
    return JSON.parse(text);
  } catch {
    // Not JSON at all — a proxy's HTML error page, or an empty body. Not an absence either way.
    return undefined;
  }
};

/**
 * A field explicitly set to `undefined` means **clear it**, which on the wire is `null`.
 *
 * This is the old table's semantics, kept: `update(id, { transferId: undefined })` deleted the
 * property, and `TransactionsStore.bulkClearCategory` and the fourteen `AppSettings` setters all
 * rely on it. `JSON.stringify` drops an `undefined` value instead, which would turn every "clear
 * this" into a patch that names no field — a silent no-op. Recursive, because `bulkUpdate` sends
 * its changes one level down inside `{ id, changes }`.
 */
const withClearedFields = (value: unknown): unknown => {
  if (value === undefined) return null;
  if (Array.isArray(value)) return value.map(withClearedFields);
  if (value === null || typeof value !== 'object') return value;

  return Object.fromEntries(
    Object.entries(value).map(([key, field]) => [key, withClearedFields(field)]),
  );
};

/**
 * The `{ error }` body `createErrorHandler` answers every failure with, server-side.
 *
 * Takes `unknown` rather than `HttpErrorResponse` for the same reason `asRejection` does: the
 * response may be built from a second copy of `@angular/common/http` and fail an identity check,
 * so the fields are read off the shape instead. Falls back to whatever message the object carries.
 */
const messageOf = (error: unknown): string => {
  const failure = error as { error?: unknown; message?: unknown } | null;
  const body = failure?.error as { error?: unknown } | null;
  if (typeof body?.error === 'string' && body.error !== '') return body.error;
  return typeof failure?.message === 'string' ? failure.message : 'Request failed';
};

@Injectable({ providedIn: 'root' })
export class ApiClient {
  private readonly http = inject(HttpClient);

  /**
   * `query` is the list endpoints' filters (`?accountId=`, `?ids=`). An empty string is a value,
   * not an omission: `?ids=` asks for no rows, which is what `bulkGet([])` answered with `[]`.
   */
  get<T>(path: string, query?: Record<string, string | number>): Promise<T> {
    return this.settled(this.http.get<T>(this.url(path), { params: query }));
  }

  /**
   * A `GET` whose 404 means "no such row" rather than a failure — the shape a table `get()`
   * had, and what `ImportBatchesRepository.getById` and `CategoryModelRepository.get` promise.
   * Every other status still rejects.
   */
  getOptional<T>(path: string): Promise<T | undefined> {
    return this.settled(this.absent(this.http.get<T>(this.url(path))));
  }

  /** The binary artifact envelope (`categoryModel`), with the same "404 is not an error" rule. */
  getBytes(path: string): Promise<ArrayBuffer | undefined> {
    return this.settled(
      this.absent(this.http.get(this.url(path), { responseType: 'arraybuffer' })),
    );
  }

  post<T>(path: string, body: unknown): Promise<T> {
    return this.settled(this.http.post<T>(this.url(path), withClearedFields(body)));
  }

  patch<T>(path: string, body: unknown): Promise<T> {
    return this.settled(this.http.patch<T>(this.url(path), withClearedFields(body)));
  }

  put<T>(path: string, body: unknown): Promise<T> {
    return this.settled(this.http.put<T>(this.url(path), withClearedFields(body)));
  }

  /**
   * Bytes out, JSON back. A whole-database import is streamed to a staging file on the server
   * rather than parsed as a request body (TICKET-SRV-11), so it must *not* be sent as JSON: the
   * app-wide parser would buffer the entire document to apply a ceiling sized for the pre-auth
   * surface, which is the limit the staging endpoint exists to get out from under.
   */
  postBytes<T>(path: string, body: Blob): Promise<T> {
    return this.settled(
      this.http.post<T>(this.url(path), body, {
        headers: { 'Content-Type': 'application/octet-stream' },
      }),
    );
  }

  /** Bytes, not JSON: a trained model is megabytes of weights (see `binary-artifact.ts`). */
  async putBytes(path: string, body: ArrayBuffer): Promise<void> {
    await this.settled(
      this.http.put(this.url(path), body, {
        headers: { 'Content-Type': 'application/octet-stream' },
        responseType: 'text',
      }),
    );
  }

  /**
   * `void` by default, because that is what a 204 answers with. Two endpoints are deletes that
   * report what they removed — `DELETE /api/accounts/:id` answers with its cascade report, which
   * `AccountsStore` has no other way to learn — so the body type is a parameter.
   */
  delete<T = void>(path: string): Promise<T> {
    return this.settled(this.http.delete<T>(this.url(path)));
  }

  private url(path: string): string {
    return `${API_BASE}${path}`;
  }

  /**
   * A 404 read as "there is no such row", not as a failure — the shape the old table `get` had.
   *
   * Keyed on the server's `clientCode`, not on the status, because 404 is also what a path matching
   * no route answers, with the same JSON shape. Were the status enough, a mistyped or unmounted URL
   * would read as "this account has no trained model" and go unnoticed for as long as it took
   * somebody to wonder why a thing they saved never came back.
   */
  private absent<T>(request: Observable<T>): Observable<T | undefined> {
    return request.pipe(
      catchError((error: unknown) =>
        error instanceof HttpErrorResponse &&
        error.status === 404 &&
        codeOf(error) === ROW_NOT_FOUND
          ? of(undefined)
          : throwError(() => error),
      ),
    );
  }

  /**
   * The promise every method above answers with: the body on success, and on any failure a
   * rejection carrying the message the server chose — never a silent `undefined`. `null` becomes
   * `undefined` because a 204 body arrives as `null` and the methods that expect one are typed
   * `Promise<void>`.
   *
   * A status of 0 is the exception (TICKET-SRV-06): nothing answered, so there is no message to
   * carry, and flattening it to a plain `Error` would leave every caller holding the string
   * `Http failure response for /api/…: 0 Unknown Error` with no way to tell an outage from a
   * refusal. `ServerUnreachableError` keeps that distinction all the way up to the store.
   */
  private settled<T>(request: Observable<T>): Promise<T> {
    return firstValueFrom(
      request.pipe(
        map((body) => body ?? (undefined as T)),
        catchError((error: unknown) => throwError(() => this.asRejection(error))),
      ),
    );
  }

  /**
   * The failure a repository rejects with: the outage type when nothing answered, and otherwise a
   * plain `Error` carrying the message the *server* chose rather than HttpClient's own prose.
   *
   * Asked through `httpStatusOf`, not `instanceof HttpErrorResponse`, because under the test
   * runner's pre-bundling the response can be built from a second copy of `@angular/common/http`
   * and fail an identity check. That would leave every rejection in a spec un-flattened — a 500
   * reaching the user as `Http failure response for /api/accounts: 500 …` instead of what the
   * server said. One definition of "came back from HTTP", shared with `isTransportFailure`.
   */
  private asRejection(error: unknown): unknown {
    const status = httpStatusOf(error);
    if (status === undefined) return error;
    return status === 0 ? new ServerUnreachableError() : new Error(messageOf(error));
  }
}
