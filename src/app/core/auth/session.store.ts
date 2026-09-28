import { computed, inject } from '@angular/core';
import { patchState, signalStore, withComputed, withMethods, withState } from '@ngrx/signals';
import { StoreResetService } from '@/core/store-reset';
import { AuthApiService } from './auth-api.service';
import { signInErrorMessage } from './auth-errors';
import type { PublicUser } from './public-user';

/**
 * `unknown` until `GET /api/auth/me` has answered once — the cookie is `HttpOnly`, so a fresh tab
 * genuinely cannot tell yet, and the guard has to wait rather than guess (TICKET-AUTH-02).
 */
export type SessionStatus = 'unknown' | 'authenticated' | 'anonymous';

type SessionState = {
  readonly user: PublicUser | null;
  readonly status: SessionStatus;
  /** The server's wording for the last failed sign-in, shown inline on the login form. */
  readonly error: string | null;
  /** A sign-in is in flight — the submit button's pending state. */
  readonly pending: boolean;
};

const ANONYMOUS: SessionState = { user: null, status: 'anonymous', error: null, pending: false };

/**
 * Who is signed in — read by the guard, the interceptor, the login form and the shell's user area.
 *
 * Lives in `core/auth/` rather than `core/state/` even though several features read it: the guard
 * and the interceptor are eager, and `@/core/state`'s barrel re-exports every entity store, so
 * reaching the session through that barrel would drag Dexie and all of them into the initial
 * bundle — exactly what the lazily-loaded shell exists to avoid.
 */
export const SessionStore = signalStore(
  { providedIn: 'root' },
  // Every key is declared here, `error`/`pending` included: a key omitted from the initial state
  // makes a later `patchState` of it unreadable.
  withState<SessionState>({ user: null, status: 'unknown', error: null, pending: false }),
  withComputed(({ user, status }) => ({
    isAuthenticated: computed(() => status() === 'authenticated'),
    /** What the shell's user area shows — the display name, or the email until one is set. */
    displayName: computed(() => user()?.displayName ?? user()?.email ?? ''),
  })),
  withMethods((store) => {
    const api = inject(AuthApiService);
    const storeReset = inject(StoreResetService);
    /** De-duplicates the `me` call when several guards resolve one deep link at once. */
    let restoration: Promise<void> | null = null;

    /**
     * Drops the signed-in user **and every other store's data** (TICKET-AUTH-02). The store reset
     * is the whole point: stores are root-provided and hydrate once, so without it the next person
     * to sign in on this browser reads the previous user's accounts straight out of memory.
     *
     * Every path that ends a session goes through here, including the one where `me` comes back
     * 401 — an asymmetry there is how a store gets missed.
     */
    const clearSession = (): void => {
      restoration = null;
      patchState(store, ANONYMOUS);
      storeReset.resetAll();
    };

    return {
      clearSession,

      /**
       * Answers "is there a session behind that cookie?" once per sign-in. A 401 here is the normal
       * signed-out case rather than an error to report — it is what the interceptor exempts.
       *
       * Both outcomes check they are still the current attempt before writing. `/login` is
       * reachable while a guard's `me` is still in flight, so without the check a slow 401 could
       * land *after* a successful sign-in and patch the fresh session back to anonymous — leaving
       * the tab signed out against a valid cookie, and `'anonymous'` rather than `'unknown'` means
       * no guard would ever ask again.
       */
      restore: (): Promise<void> => {
        const attempt: Promise<void> = (restoration ??= api.me().then(
          (user) => {
            if (restoration === attempt)
              patchState(store, { user, status: 'authenticated', error: null });
          },
          () => {
            if (restoration === attempt) clearSession();
          },
        ));
        return attempt;
      },

      /** Resolves `true` when the credentials were accepted; the error line stays on the store. */
      login: async (email: string, password: string): Promise<boolean> => {
        patchState(store, { pending: true, error: null });
        try {
          const user = await api.login(email, password);
          // Empty the stores *before* adopting the new identity, unconditionally. Signing out is
          // not the only way a session changes: `/login` is reachable with a live session, so
          // somebody can sign in as B while A's stores are still full. `rehydrateAll` alone would
          // not fix it — `hydrate()` is memoised, so on an already-hydrated store it is a no-op
          // and A's rows would simply stay on screen.
          storeReset.resetAll();

          // A fresh sign-in is its own answer to `me`, so a guard resolving the return URL a tick
          // later must not fire a second identity call to learn what this one just established.
          // Assigned after the reset above, which nulls it.
          restoration = Promise.resolve();
          patchState(store, { user, status: 'authenticated', error: null, pending: false });
          // Re-loads what the reset just emptied. A store hydrates on its *first* injection, which
          // on a second sign-in in the same tab has long since happened — without this the pages
          // the previous user visited would render empty until a full reload.
          void storeReset.rehydrateAll();
          return true;
        } catch (error) {
          patchState(store, { ...ANONYMOUS, error: signInErrorMessage(error) });
          return false;
        }
      },

      /**
       * Clears the session locally whatever the server said: a logout that never reached the server
       * must still leave this browser signed out and this browser's stores empty. The server error
       * is then **re-thrown** — the local state is already correct, so callers navigate regardless
       * and catch it only to decide whether to say anything.
       */
      logout: async (): Promise<void> => {
        try {
          await api.logout();
        } finally {
          clearSession();
        }
      },
    };
  }),
);
