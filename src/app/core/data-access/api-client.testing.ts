import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

/**
 * The harness every repository spec runs on (TICKET-SRV-05).
 *
 * The repositories stopped being Dexie wrappers, so their specs stopped being database round trips:
 * what a repository is responsible for now is **which request it makes and what it turns the
 * response into**. Whether SQLite then upserts by month, or falls back to a `DEFAULT_*`, or applies
 * a reorder atomically, is the server's behaviour and is covered by its own tests — asserting it
 * again here against a fake would only pin the fake.
 *
 * Bracketed like `withCleanFormatSettings()`: called at the top of a `describe`, it installs the
 * fake backend before each test and, after each, **fails on any request the spec did not account
 * for** — which is what makes "exactly one request per method" an assertion rather than a hope.
 */
export const withApiTesting = (): void => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
  });

  afterEach(() => {
    TestBed.inject(HttpTestingController).verify();
  });
};

/**
 * Lets a method that awaits something *before* its request — `ImportService.commitImport` reads the
 * account's transactions first — get as far as making it. A microtask drain, not a delay.
 */
export const untilRequested = (): Promise<void> => new Promise((resolve) => setTimeout(resolve, 0));

/** One call's worth of expectation: the documented endpoint, and the body it is documented to send. */
export type ExpectedApiCall = {
  readonly method: string;
  /** Including the query string, which is part of which endpoint was called. */
  readonly url: string;
  /** Asserted only when given — a `GET` has none, and a few endpoints take an empty one. */
  readonly body?: unknown;
};

/**
 * Drives one repository method end to end: invoke it, assert the single request it made is the
 * documented one, answer that request, and resolve to whatever the repository made of the response.
 *
 * `response` is flushed as the body, so a 204 endpoint takes the default `null`.
 */
export const callApi = async <T>(
  call: () => Promise<T>,
  expected: ExpectedApiCall,
  response: unknown = null,
): Promise<T> => {
  const settled = call();
  const request = TestBed.inject(HttpTestingController).expectOne(expected.url);

  expect(request.request.method).toBe(expected.method);
  if ('body' in expected) expect(request.request.body).toEqual(expected.body);
  // `never` because `flush` is typed for the body shapes HttpClient itself produces, and a spec's
  // fixture is an entity rather than one of them.
  request.flush(response as never);

  return settled;
};

/** The same, for a call that is expected to reject: resolves to the message it rejected with. */
export const failApiCall = async (
  call: () => Promise<unknown>,
  expected: ExpectedApiCall,
  failure: { status: number; body: unknown },
): Promise<string> => {
  const settled = call();
  const request = TestBed.inject(HttpTestingController).expectOne(expected.url);

  expect(request.request.method).toBe(expected.method);
  request.flush(failure.body as never, { status: failure.status, statusText: 'Error' });

  return settled.then(
    // Fails the spec rather than resolving a sentence about it: returned as a string, a caller
    // asserting `toBeDefined()` or `toBeTruthy()` would pass on the very outcome it is testing for.
    () => expect.fail(`${expected.method} ${expected.url} resolved instead of rejecting`),
    (error: unknown) => (error as Error).message,
  );
};
