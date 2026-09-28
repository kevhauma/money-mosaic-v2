import { inject, Injectable } from '@angular/core';
import { getState, patchState, type WritableStateSource } from '@ngrx/signals';

/**
 * The list of stores that must be emptied when the signed-in user changes (TICKET-AUTH-02).
 *
 * Every store in this app was written on the assumption that one browser means one dataset for the
 * lifetime of the tab — stores are `providedIn: 'root'`, hydrate once on first injection
 * (TICKET-PERF-07) and are never torn down. Signing out does not destroy the root injector, so
 * without this the next person to sign in on the same browser reads the previous user's accounts
 * and transactions straight out of memory.
 *
 * Registration is **runtime**, from each store's own `onInit`, rather than a hand-written list of
 * store classes here: a list would have to inject all seventeen stores to reset them, which would
 * drag every feature store (and Dexie behind them) into the eager bundle and undo the lazy-loading
 * the route table exists for. A store that was never injected holds no data, so a store that never
 * ran `onInit` has nothing to reset.
 *
 * `store-reset-registry.spec.ts` is what keeps this honest: it fails when a hydrating store ships
 * without a `registerStoreReset` call.
 *
 * ## What this does *not* do, until TICKET-SRV-05
 *
 * It empties **in-memory signal state** and clears each store's memoised hydration promise. That
 * is all. Entity data still lives in the one un-namespaced `money-mosaic` IndexedDB, shared by
 * everyone who uses this browser — so the next person to sign in rehydrates from the *same*
 * database and sees the previous user's accounts and transactions again.
 *
 * Until TICKET-SRV-05 moves entity data onto the server, **sign-out is a UI boundary, not a data
 * boundary**, and anyone who opens devtools can read the previous user's figures regardless. The
 * plumbing here is what SRV-05 needs in place; it is not the guarantee on its own.
 */
type StoreRegistration = {
  /** Empties the store back to its initial state and forgets its memoised hydration. */
  readonly reset: () => void;
  /** Loads the store again — the same idempotent `hydrate()` its first injection called. */
  readonly hydrate: () => Promise<void>;
};

@Injectable({ providedIn: 'root' })
export class StoreResetService {
  /** Keyed by store name so a store injected twice (or re-registered in a test) registers once. */
  private readonly registrations = new Map<string, StoreRegistration>();

  register(storeName: string, reset: () => void, hydrate: () => Promise<void>): void {
    this.registrations.set(storeName, { reset, hydrate });
  }

  /** The stores that have actually been injected this session — read by tests and diagnostics. */
  registeredStoreNames(): readonly string[] {
    return [...this.registrations.keys()];
  }

  /**
   * Empties every registered store back to the state it was constructed with. Synchronous on
   * purpose: sign-out navigates immediately afterwards, and a half-reset store rendered in between
   * is the failure this exists to prevent.
   */
  resetAll(): void {
    for (const { reset } of this.registrations.values()) reset();
  }

  /**
   * Re-loads every store that was emptied, for the user who just signed in.
   *
   * Needed because a store hydrates from `withHooks({ onInit })` — its *first* injection
   * (TICKET-PERF-07) — and that has already happened by the time a second user signs in on the
   * same tab. Without this, the stores reset at sign-out would stay empty until a full reload.
   */
  rehydrateAll(): Promise<void> {
    return Promise.all([...this.registrations.values()].map(({ hydrate }) => hydrate())).then(
      () => undefined,
    );
  }
}

/**
 * Builds a store's own `reset()` from the state it was constructed with. Called from
 * `withMethods`, where the store's memoised hydration promise lives.
 *
 * `clearHydrationCache` clears that promise — without it the emptied store would answer the next
 * user's `hydrate()` from the previous user's already-resolved promise and stay empty forever.
 */
export const createStoreReset = <State extends object>(
  store: WritableStateSource<State>,
  clearHydrationCache: () => void,
): (() => void) => {
  // Snapshotted here, during store construction, so it is genuinely the initial state: every
  // hydration in this app patches from inside a promise callback, never synchronously.
  const initialState = getState(store);
  return () => {
    clearHydrationCache();
    patchState(store, initialState);
  };
};

/**
 * Adds a store's `reset()` to the registry. Called from `withHooks({ onInit })` — the first
 * injection of the store — which is both where an injection context exists and the moment the
 * store starts holding data worth clearing.
 */
export const registerStoreReset = (
  storeName: string,
  reset: () => void,
  hydrate: () => Promise<void>,
): void => {
  inject(StoreResetService).register(storeName, reset, hydrate);
};
