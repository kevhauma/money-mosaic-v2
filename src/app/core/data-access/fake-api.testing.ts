import {
  HttpBackend,
  HttpErrorResponse,
  HttpResponse,
  provideHttpClient,
  type HttpEvent,
  type HttpRequest,
} from '@angular/common/http';
import { Injectable, InjectionToken, inject } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { defer, type Observable } from 'rxjs';

/**
 * A backend that answers, for specs that are **not about the API** (TICKET-SRV-05).
 *
 * Every store hydrates on first injection (TICKET-PERF-07), so a component spec that mounts a real
 * one makes requests whether or not it cares about them. Against `HttpTestingController` those
 * requests simply hang, and a component waiting on a store that never resolves is a five-second
 * timeout rather than a test result. Against no backend at all they escape as real XHRs, which
 * jsdom fails, and a rejected hydration is an unhandled rejection.
 *
 * So these specs get a backend that answers the way an **empty account** would: lists are empty,
 * unwritten singletons are `{}` (the repository layers its `DEFAULT_*` over that), a create is
 * echoed back with an id. That is exactly the state `appDb.<table>.clear()` used to put them in,
 * which is why this replaces those hooks one for one rather than each spec growing a stub per
 * repository.
 *
 * A spec that needs a *stored* value seeds it — `provideFakeApi({ '/api/settings/appSettings':
 * { privacyMode: true } })` — and a `PATCH` merges into the same seed, so a write followed by a read
 * round-trips the way the database did. A spec that wants to assert what was written reads `calls`.
 *
 * Repository and operation-service specs use `withApiTesting()` instead: what *they* are about is
 * which request is made, and that wants an assertable backend, not an obliging one.
 */

/** Seeded bodies by URL, for the rows a spec wants to already exist. Mutated by `PATCH`. */
export type FakeApiSeed = Record<string, unknown>;

const FAKE_API_SEED = new InjectionToken<FakeApiSeed>('FAKE_API_SEED');

/** What a `DELETE`/`POST` on a cascading path answers with — nothing removed. */
const EMPTY_CASCADE = {
  removedTransactionIds: [],
  unlinkedTransferIds: [],
  clearedTransferTransactionIds: [],
  clearedAttributionOverrides: [],
};

const segmentsOf = (url: string): string[] =>
  new URL(url, 'http://localhost').pathname.split('/').filter(Boolean);

const isId = (segment: string | undefined): boolean =>
  segment !== undefined && /^\d+$/.test(segment);

/** What an empty account reads as, per endpoint shape. */
const readBody = (url: string): unknown => {
  const segments = segmentsOf(url);
  const last = segments[segments.length - 1];

  if (last === 'count') return { count: 0 };
  if (last === 'export')
    return { schemaVersion: 1, exportedAt: '2026-01-01T00:00:00.000Z', tables: {} };
  // What an account with nothing but its seed looks like (TICKET-SRV-07) — a component spec that
  // mounts the shell must not be told it has data to protect from a migration nobody is running.
  if (last === 'migrate-local') return { counts: {}, hasExistingData: false };
  if (last === 'undo-preview')
    return { rowCount: 0, manuallyCategorisedCount: 0, transferLinkedCount: 0 };
  if (segments[1] === 'settings') return {};
  // A single row nobody seeded, and the trained model of a user who has never trained one.
  if (isId(last) || segments[1] === 'categoryModel') return undefined;

  return [];
};

/**
 * The commit's own shape: the batch with an id, and every accepted row carrying it. Spelled out
 * because `ImportBatchesStore.commitImport` reads `addedTransactions` straight into the rules engine
 * — a generic echo would hand it `undefined`.
 */
const commitBody = (body: unknown, nextId: () => number): unknown => {
  const { batch, transactions, backfill } = body as {
    batch: Record<string, unknown>;
    transactions: Record<string, unknown>[];
    backfill: unknown[];
  };
  const id = nextId();

  return {
    batch: { ...batch, id },
    addedTransactions: transactions.map((row) => ({ ...row, id: nextId(), importBatchId: id })),
    duplicateCount: batch['rowsDuplicate'] ?? 0,
    backfilledTransactions: backfill ?? [],
  };
};

const writeBody = (request: HttpRequest<unknown>, nextId: () => number): unknown => {
  const segments = segmentsOf(request.url);
  const last = segments[segments.length - 1];
  const body = request.body;

  if (last === 'commit') return commitBody(body, nextId);
  // An auto-link pass answers one result per candidate, in order: `TransferMatchingService` maps
  // over them, and `TransfersStore` mirrors both legs out of each.
  if (last === 'batch')
    return (body as Record<string, unknown>[]).map((link) => ({
      transfer: { ...link, id: nextId() },
      updatedTransactions: [{ id: link['fromTransactionId'] }, { id: link['toTransactionId'] }],
    }));
  if (last === 'undo') return { unlinkedTransferIds: [], clearedTransferTransactionIds: [] };
  if (last === 'bulk' && request.method === 'POST')
    return { ids: (body as unknown[]).map(() => nextId()) };
  if (last === 'bulk') return { updated: (body as unknown[]).length };
  if (last === 'delete' || last === 'unlink' || request.method === 'DELETE') return EMPTY_CASCADE;
  if (segments[1] === 'settings') return body;

  return { ...(body as Record<string, unknown>), id: nextId() };
};

@Injectable()
export class FakeApiBackend implements HttpBackend {
  /** Every request this backend answered, in order — for a spec asserting what was written. */
  readonly calls: { method: string; url: string; body: unknown }[] = [];

  /** Bodies a spec wants to already exist, by URL. A settings `PATCH` merges into it. */
  readonly seed = inject(FAKE_API_SEED);

  private lastId = 100;

  handle(request: HttpRequest<unknown>): Observable<HttpEvent<unknown>> {
    this.calls.push({ method: request.method, url: request.urlWithParams, body: request.body });

    // Async, like the database it replaces: a store's `await` has to actually suspend, or a
    // component reads state that a real hydration would not have reached yet.
    return defer(async () => this.answer(request));
  }

  private answer(request: HttpRequest<unknown>): HttpResponse<unknown> {
    const url = request.urlWithParams;

    if (request.method === 'GET') {
      const body = this.seed[url] ?? readBody(url);
      if (body === undefined) throw this.notFound(url);
      return new HttpResponse({ body, status: 200, url });
    }

    const body = writeBody(request, () => (this.lastId += 1));
    // A settings patch merges into the seed, so the next read sees what was just written, and the
    // merged row is what answers — a settings PATCH replies with the whole settings object.
    if (segmentsOf(url)[1] === 'settings' && request.method === 'PATCH') {
      this.seed[url] = { ...(this.seed[url] as object), ...(body as object) };
      return new HttpResponse({ body: this.seed[url], status: 200, url });
    }

    // Every other write answers its own echo, never the seed. Answering `seed[url]` here would mean
    // a spec that seeded a *collection* (`seedApi('/api/accounts', [...])`) and then exercised a
    // create got the seeded array back, so `add`'s `.then(({ id }) => id)` would destructure an
    // array and resolve `undefined` — a row silently added with no id.
    return new HttpResponse({ body, status: 200, url });
  }

  /**
   * The server's "no such row" 404, `code` included. The code is the load-bearing half: `ApiClient`
   * reads a 404 as absence only when it carries one, so a fake that left it out would make every
   * `getOptional` on an empty account reject instead of resolving `undefined`.
   */
  private notFound(url: string): HttpErrorResponse {
    return new HttpErrorResponse({
      status: 404,
      statusText: 'Not Found',
      url,
      error: { error: 'Not found', code: 'row_not_found' },
    });
  }
}

/**
 * Makes a row already exist, for a spec whose subject is what a *stored* value renders as — the
 * replacement for the `appDb.<table>.put(...)` those specs used to seed with. Call it after the
 * TestBed is configured and before the component is created, like the write it replaces.
 */
export const seedApi = (url: string, body: unknown): void => {
  TestBed.inject(FakeApiBackend).seed[url] = body;
};

/**
 * Every request the fake backend answered, in order — for a spec asserting what was *not* written.
 * The replacement for the `expect(await appDb.<table>.count()).toBe(0)` such specs used, and a
 * stricter one: it sees the request, so it fails on a write the server would have rejected too.
 */
export const apiCalls = (): readonly { method: string; url: string; body: unknown }[] =>
  TestBed.inject(FakeApiBackend).calls;

export const provideFakeApi = (seed: FakeApiSeed = {}): unknown[] => [
  provideHttpClient(),
  FakeApiBackend,
  { provide: FAKE_API_SEED, useValue: seed },
  { provide: HttpBackend, useExisting: FakeApiBackend },
];
