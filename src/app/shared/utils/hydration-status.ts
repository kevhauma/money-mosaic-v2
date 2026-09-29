import { computed, type Signal } from '@angular/core';

/**
 * Joining several stores' hydration state into the one a page can render (TICKET-SRV-06).
 *
 * No page depends on a single store: the Dashboard reads transactions, accounts and categories, and
 * "is this page ready?" is the same question about all three. Asking it per store in the template
 * is how a page ends up showing a skeleton beside a number that is really a zero — so it is asked
 * once, here, and the page branches on the answer.
 */

/** The slice of a hydrating store this reads — every store built by `createHydration` matches it. */
export type HydratingStore = {
  readonly loading: Signal<boolean>;
  readonly error: Signal<string | null>;
  readonly retry: () => Promise<void>;
};

export type HydrationStatus = {
  /** Any of the stores is still loading. */
  readonly loading: Signal<boolean>;
  /** The first failure, or `null`. One message: five copies of "couldn't reach the server" is noise. */
  readonly error: Signal<string | null>;
  /** Re-reads **only the stores that failed** — the ones that loaded are already correct. */
  readonly retry: () => void;
};

export const hydrationOf = (...stores: readonly HydratingStore[]): HydrationStatus => ({
  loading: computed(() => stores.some((store) => store.loading())),
  error: computed(
    () => stores.map((store) => store.error()).find((message) => message !== null) ?? null,
  ),
  retry: () => {
    for (const store of stores) {
      // `retry()` swallows its own rejection and records the outcome on the store, so there is
      // nothing to await or catch here.
      if (store.error() !== null) void store.retry();
    }
  },
});
