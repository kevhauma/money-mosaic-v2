import { patchState, signalStoreFeature, withState, type WritableStateSource } from '@ngrx/signals';
import { httpStatusOf, isTransportFailure, SERVER_UNREACHABLE_MESSAGE } from '@/core/server-status';
import { createStoreReset, retryOnFailure } from './store-reset.service';

/**
 * The loading/error pair every hydrating store carries since TICKET-SRV-06.
 *
 * Against a local database a hydration resolved in a microtask and could not fail, so "empty" and "not
 * loaded yet" were the same thing for about a frame and nobody could tell. Against a server they
 * are minutes apart and one of them is a lie: a dashboard that renders €0 because the request
 * failed is worse than one that says it failed, because the user believes the number.
 */
export type HydrationState = {
  /** A hydration is in flight. Set synchronously by `hydrate()`, so no frame renders un-flagged. */
  readonly loading: boolean;
  /** What to tell the user about the last failed hydration, or `null` while things are fine. */
  readonly error: string | null;
};

/** What a store says when the failure carried nothing quotable. */
const HYDRATION_FAILED = 'Could not load this data.';

/**
 * Adds `loading` and `error` to a store's state, both keys declared with a value.
 *
 * Declaring them is not optional and not cosmetic: `withState` fixes the shape of the state signal
 * once, and a key that was never declared cannot be read back after `patchState` writes it — the
 * `DEFAULT_APP_SETTINGS` gotcha in the data-model skill. A store that patched `loading` without
 * declaring it would show a spinner that never turns off, in a way that looks like a race.
 *
 * Applied *before* the `withMethods` block that calls `createHydration`, so the reset snapshot that
 * block takes includes both keys and signing out clears a stale error along with the data.
 */
export function withHydrationState() {
  return signalStoreFeature(withState<HydrationState>({ loading: false, error: null }));
}

/**
 * What a user should read about a failed hydration.
 *
 * An outage gets the one sentence that names the actual problem — every store failing at once with
 * its own wording for "the network broke" is noise. Anything else is an answer from the server, and
 * `ApiClient` has already put the server's own words on it, so they are quoted rather than replaced
 * by a generic sentence that throws away the only useful detail.
 */
export const hydrationErrorMessage = (error: unknown): string => {
  if (isTransportFailure(error)) return SERVER_UNREACHABLE_MESSAGE;
  return error instanceof Error && error.message !== '' ? error.message : HYDRATION_FAILED;
};

/**
 * Logs anything that is not the server answering — because from here on, nothing else will.
 *
 * The store's `onInit` hydration is fire-and-forget, so its rejection is deliberately swallowed to
 * keep it out of the unhandled-rejection count. That is right for an outage or a 500, which the user
 * is already being shown. It is wrong for a `TypeError` from a renamed repository method or a bad
 * mapper: that has a stack worth reading, and without this it would reach the user as a sentence
 * under "Try again" and reach the console not at all. Before this lifecycle existed, a bare
 * `void store.hydrate()` at least produced an unhandled rejection with the trace attached.
 */
const reportIfUnexpected = (error: unknown): void => {
  if (httpStatusOf(error) === undefined && !isTransportFailure(error)) console.error(error);
};

/** The three members `createHydration` builds for a store — its whole hydration lifecycle. */
export type StoreHydration = {
  /** Idempotent. `force: true` re-fetches even after a prior hydration resolved. */
  readonly hydrate: (options?: { force?: boolean }) => Promise<void>;
  /** The user pressing "try again" on a failed load — a forced re-fetch that never rejects. */
  readonly retry: () => Promise<void>;
  /** Empties the store and forgets the memoised hydration (TICKET-AUTH-02). */
  readonly reset: () => void;
};

/**
 * Builds a store's `hydrate`/`retry`/`reset` from the one thing that differs between stores: the
 * read (TICKET-SRV-06).
 *
 * Eighteen stores hand-rolled the same twelve lines — memoise the promise, forget it if it rejects,
 * build a reset that clears the memo — which was tolerable while a hydration could not fail. Adding
 * a loading flag, an error message and a retry to each of those copies is where hand-rolling stops
 * paying: the store that got one of them subtly wrong would be the store whose spinner never stops,
 * and nothing would fail until someone opened that page with the server down.
 *
 * `load` does the store's own reading and patching and nothing else — no `try`/`catch`, no state
 * flags. Everything a failure needs is here, once.
 */
export const createHydration = <State extends HydrationState>(
  store: WritableStateSource<State>,
  load: () => Promise<void>,
  /**
   * How to describe a failure, for the one store whose read does not go through `ApiClient`:
   * `AdminUsersStore` calls `AuthApiService`'s tier directly, so its rejections are raw
   * `HttpErrorResponse`s and `authErrorMessage` is what turns those into a sentence. Everything
   * else takes the default.
   */
  describeFailure: (error: unknown) => string = hydrationErrorMessage,
): StoreHydration => {
  // The cast is the price of being generic over the rest of the store's state: `State` is known to
  // include `HydrationState`, so writing those two keys is sound, but TypeScript cannot see that
  // `Partial<HydrationState>` is a `Partial<State>` for an unknown `State`.
  const patchHydration = (changes: Partial<HydrationState>): void => {
    patchState(store, changes as Partial<State>);
  };

  let hydration: Promise<void> | null = null;
  const reset = createStoreReset(store, () => {
    hydration = null;
  });

  const hydrate = (options?: { force?: boolean }): Promise<void> => {
    if (!hydration || options?.force) {
      patchHydration({ loading: true, error: null });
      hydration = retryOnFailure(
        load().then(() => {
          patchHydration({ loading: false, error: null });
        }),
        // Runs before the rejection is re-thrown, so by the time any awaiting caller sees the
        // failure the store already carries the message the UI will show.
        (error) => {
          hydration = null;
          reportIfUnexpected(error);
          patchHydration({ loading: false, error: describeFailure(error) });
        },
      );
    }
    return hydration;
  };

  return {
    hydrate,
    reset,
    /**
     * Swallows the rejection rather than re-throwing it: this is called from a click handler on an
     * error message, the outcome is already on the store's `error`, and a rejected promise nobody
     * awaits is an unhandled rejection in the console for a failure the UI is already reporting.
     */
    retry: () => hydrate({ force: true }).catch(() => undefined),
  };
};
