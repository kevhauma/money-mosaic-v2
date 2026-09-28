import { computed, inject } from '@angular/core';
import { patchState, signalStore, withComputed, withMethods, withState } from '@ngrx/signals';
import { StoreResetService } from '@/core/store-reset';
import { AuthApiService } from './auth-api.service';
import { authErrorMessage, signInErrorMessage } from './auth-errors';
import type { SessionUser } from './public-user';

/**
 * `unknown` until `GET /api/auth/me` has answered once — the cookie is `HttpOnly`, so a fresh tab
 * genuinely cannot tell yet, and the guard has to wait rather than guess (TICKET-AUTH-02).
 */
export type SessionStatus = 'unknown' | 'authenticated' | 'anonymous';

type SessionState = {
  readonly user: SessionUser | null;
  readonly status: SessionStatus;
  /** The server's wording for the last failed sign-in, shown inline on the login form. */
  readonly error: string | null;
  /** A sign-in is in flight — the submit button's pending state. */
  readonly pending: boolean;
  /**
   * The default-password reminder was dismissed (TICKET-AUTH-04). Deliberately *not* persisted: the
   * banner is meant to come back next session for as long as the shared password is still in place,
   * and a remembered dismissal is how a reminder becomes furniture nobody sees. Part of
   * `ANONYMOUS`, so signing out (or in as somebody else) starts the nag over.
   */
  readonly defaultPasswordNoticeDismissed: boolean;
};

const ANONYMOUS: SessionState = {
  user: null,
  status: 'anonymous',
  error: null,
  pending: false,
  defaultPasswordNoticeDismissed: false,
};

/** What the Settings form shows when a password change failed with nothing quotable. */
const PASSWORD_CHANGE_FAILED = 'Could not change your password. Please try again.';
/** Same, for the display-name save. */
const RENAME_FAILED = 'Could not save your display name. Please try again.';

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
  withState<SessionState>({
    user: null,
    status: 'unknown',
    error: null,
    pending: false,
    defaultPasswordNoticeDismissed: false,
  }),
  withComputed(({ user, status, defaultPasswordNoticeDismissed }) => ({
    isAuthenticated: computed(() => status() === 'authenticated'),
    /** What the shell's user area shows — the display name, or the email until one is set. */
    displayName: computed(() => user()?.displayName ?? user()?.email ?? ''),
    /**
     * Whether to show the standing "this installation still uses `admin` / `admin`" reminder
     * (TICKET-AUTH-04). Three conditions, deliberately spelled out rather than trusted to the
     * server's flag alone: an admin (the only role that could be the seeded account, and the only
     * one for whom the warning is actionable), still on the seeded password, and not already
     * waved away this session.
     */
    showDefaultPasswordNotice: computed(
      () =>
        user()?.role === 'admin' &&
        user()?.usingDefaultPassword === true &&
        !defaultPasswordNoticeDismissed(),
    ),
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
          patchState(store, {
            user,
            status: 'authenticated',
            error: null,
            pending: false,
            // Reset explicitly, for the same reason the stores above are: signing in is not always
            // preceded by signing out. Without this, A dismissing the reminder would hide it from B
            // when B signs in over the top of A's session.
            defaultPasswordNoticeDismissed: false,
          });
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

      /** Waves the default-password reminder away until the next sign-in (TICKET-AUTH-04). */
      dismissDefaultPasswordNotice: (): void => {
        patchState(store, { defaultPasswordNoticeDismissed: true });
      },

      /**
       * Changes the signed-in user's own password (TICKET-AUTH-04). Resolves `null` on success, or
       * the message to show — the server's own wording for a wrong current password.
       *
       * The message is **returned** rather than parked on the store's `error`, unlike `login`: that
       * one belongs to a screen the app navigates away from on success, while this belongs to a
       * form on a page you stay on and come back to, and a root-store error would still be sitting
       * there on the next visit.
       *
       * The server keeps this session alive and ends the user's others, so there is nothing to
       * re-authenticate here. Patching the answer in is what retires the reminder banner: the
       * updated user carries `usingDefaultPassword: false`.
       */
      changePassword: async (
        currentPassword: string,
        newPassword: string,
      ): Promise<string | null> => {
        try {
          patchState(store, { user: await api.changePassword(currentPassword, newPassword) });
          return null;
        } catch (error) {
          return authErrorMessage(error, PASSWORD_CHANGE_FAILED);
        }
      },

      /**
       * Renames the signed-in user. Resolves `null` on success, or the message to show.
       *
       * The patched user is what updates the shell's user area without a reload — the shell reads
       * `displayName` off this same store.
       */
      updateDisplayName: async (displayName: string): Promise<string | null> => {
        try {
          patchState(store, { user: await api.updateDisplayName(displayName) });
          return null;
        } catch (error) {
          return authErrorMessage(error, RENAME_FAILED);
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
