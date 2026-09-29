import { signal } from '@angular/core';
import { hydrationOf, type HydratingStore } from './hydration-status';

const fakeStore = (
  overrides: { loading?: boolean; error?: string | null } = {},
): HydratingStore & { retries: number } => {
  const store = {
    loading: signal(overrides.loading ?? false),
    error: signal(overrides.error ?? null),
    retries: 0,
    retry: (): Promise<void> => {
      store.retries += 1;
      return Promise.resolve();
    },
  };
  return store;
};

describe('hydrationOf: one answer for a page built on several stores (TICKET-SRV-06)', () => {
  it('is loading while any of them is', () => {
    const status = hydrationOf(fakeStore(), fakeStore({ loading: true }));

    expect(status.loading()).toBe(true);
  });

  it('is done only when all of them are', () => {
    const status = hydrationOf(fakeStore(), fakeStore());

    expect(status.loading()).toBe(false);
    expect(status.error()).toBeNull();
  });

  it('shows one message rather than the same outage repeated per store', () => {
    const status = hydrationOf(
      fakeStore({ error: 'Cannot reach the server. Is it running?' }),
      fakeStore({ error: 'Cannot reach the server. Is it running?' }),
    );

    expect(status.error()).toBe('Cannot reach the server. Is it running?');
  });

  it('retries only the stores that failed — the ones that loaded are already correct', () => {
    const failed = fakeStore({ error: 'nope' });
    const loaded = fakeStore();

    hydrationOf(loaded, failed).retry();

    expect(failed.retries).toBe(1);
    expect(loaded.retries).toBe(0);
  });
});
