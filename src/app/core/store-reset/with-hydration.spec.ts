import { HttpErrorResponse } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { getState, patchState, signalStore, withMethods, withState } from '@ngrx/signals';
import { SERVER_UNREACHABLE_MESSAGE, ServerUnreachableError } from '@/core/server-status';
import { createHydration, hydrationErrorMessage, withHydrationState } from './with-hydration';

/**
 * The shared hydration lifecycle every store now gets (TICKET-SRV-06), tested on a store built for
 * the purpose rather than on one of the eighteen real ones: what is under test is the helper, and a
 * real store would drag its repository, its entity config and its collaborators in to prove
 * nothing extra.
 */
describe('createHydration', () => {
  /** Resolved/rejected by each test, so the store's read is under the test's control. */
  let read: () => Promise<number[]>;
  let reads: number;

  const TestStore = signalStore(
    { providedIn: 'root' },
    withState({ rows: [] as number[] }),
    withHydrationState(),
    withMethods((store) => {
      const { hydrate, retry, reset } = createHydration(store, async () => {
        reads += 1;
        patchState(store, { rows: await read() });
      });
      return { hydrate, retry, reset };
    }),
  );

  const store = (): InstanceType<typeof TestStore> => TestBed.inject(TestStore);

  beforeEach(() => {
    reads = 0;
    read = () => Promise.resolve([1, 2]);
    TestBed.configureTestingModule({});
  });

  it('starts out neither loading nor failed', () => {
    expect(getState(store())).toMatchObject({ rows: [], loading: false, error: null });
  });

  it('flags loading synchronously, so no frame renders an un-flagged empty store', () => {
    const settled = store().hydrate();

    expect(store().loading()).toBe(true);
    return settled;
  });

  it('clears loading and keeps error null once the read lands', async () => {
    await store().hydrate();

    expect(store().rows()).toEqual([1, 2]);
    expect(store().loading()).toBe(false);
    expect(store().error()).toBeNull();
  });

  it('reads once however many callers await it', async () => {
    await Promise.all([store().hydrate(), store().hydrate(), store().hydrate()]);

    expect(reads).toBe(1);
  });

  it('records the failure, clears loading, and still rejects for whoever awaited it', async () => {
    read = () => Promise.reject(new Error('Account not found'));

    await expect(store().hydrate()).rejects.toThrow('Account not found');
    expect(store().loading()).toBe(false);
    expect(store().error()).toBe('Account not found');
  });

  it('does not remember a failure: the next hydrate genuinely asks again', async () => {
    read = () => Promise.reject(new Error('nope'));
    await store()
      .hydrate()
      .catch(() => undefined);

    read = () => Promise.resolve([7]);
    await store().hydrate();

    expect(reads).toBe(2);
    expect(store().rows()).toEqual([7]);
    expect(store().error()).toBeNull();
  });

  it('retries once per press, clearing the error while it is in flight', async () => {
    read = () => Promise.reject(new Error('nope'));
    await store()
      .hydrate()
      .catch(() => undefined);

    read = () => Promise.resolve([9]);
    await store().retry();

    expect(reads).toBe(2);
    expect(store().rows()).toEqual([9]);
    expect(store().error()).toBeNull();
  });

  it('never rejects out of retry — the outcome is on the store, and nothing awaits it', async () => {
    read = () => Promise.reject(new Error('still nope'));

    await expect(store().retry()).resolves.toBeUndefined();
    expect(store().error()).toBe('still nope');
  });

  it('re-reads on retry even after a hydration that succeeded', async () => {
    await store().hydrate();
    await store().retry();

    expect(reads).toBe(2);
  });

  it('clears the error along with the data when the signed-in user changes', async () => {
    read = () => Promise.reject(new Error('nope'));
    await store()
      .hydrate()
      .catch(() => undefined);

    store().reset();

    expect(store().error()).toBeNull();
    expect(store().loading()).toBe(false);
  });
});

describe('hydrationErrorMessage', () => {
  it('says the server could not be reached, rather than quoting HttpClient at the user', () => {
    expect(hydrationErrorMessage(new ServerUnreachableError())).toBe(SERVER_UNREACHABLE_MESSAGE);
    expect(hydrationErrorMessage(new HttpErrorResponse({ status: 0 }))).toBe(
      SERVER_UNREACHABLE_MESSAGE,
    );
  });

  it("quotes the server's own words for anything it answered", () => {
    expect(hydrationErrorMessage(new Error('This account is not yours'))).toBe(
      'This account is not yours',
    );
  });

  it('falls back to a sentence when the failure carried nothing quotable', () => {
    expect(hydrationErrorMessage(undefined)).toBe('Could not load this data.');
    expect(hydrationErrorMessage(new Error(''))).toBe('Could not load this data.');
  });
});
