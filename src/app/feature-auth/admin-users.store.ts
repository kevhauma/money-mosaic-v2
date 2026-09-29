import { computed, inject } from '@angular/core';
import {
  patchState,
  signalStore,
  withComputed,
  withHooks,
  withMethods,
  withState,
} from '@ngrx/signals';
import {
  AdminUsersApiService,
  authErrorMessage,
  SessionStore,
  type AdminUser,
  type AdminUserChanges,
  type NewAccount,
} from '@/core/auth';
import { createHydration, registerStoreReset, withHydrationState } from '@/core/store-reset';

type AdminUsersState = {
  readonly users: readonly AdminUser[];
};

const EMPTY: AdminUsersState = { users: [] };

const LOAD_FAILED = 'Could not load the accounts. Please try again.';
const CREATE_FAILED = 'Could not create the account. Please try again.';
const SAVE_FAILED = 'Could not save that change. Please try again.';
const RESET_FAILED = 'Could not reset the password. Please try again.';
const DELETE_FAILED = 'Could not delete the account. Please try again.';

/**
 * Every account on this installation, for the admin panel (TICKET-AUTH-03).
 *
 * Lives in `feature-auth` rather than `core/state`, per the placement rule: the one page that reads
 * it is `/admin/users`. It is not reachable from the feature's barrel either, so a signed-out
 * visitor's `/login` chunk does not carry it.
 *
 * **Each mutation returns the message to show rather than parking it on `error`** — the TICKET-AUTH-04
 * convention. The server's refusals are the whole vocabulary of this page ("this is the last
 * administrator…", "an account with that email already exists"), they belong next to the control
 * that was pressed, and a root store's error would still be there on the next visit. `error` is kept
 * for the *list*, which is this store's own state and is re-answered by every load.
 */
export const AdminUsersStore = signalStore(
  { providedIn: 'root' },
  // Spread rather than shared by reference, and every key is declared: a key omitted from the
  // initial state makes a later `patchState` of it unreadable. `loading`/`error` are no longer
  // among them — they are `withHydrationState`'s, shared with every other hydrating store
  // (TICKET-SRV-06), and this store's own `load` no longer sets them.
  withState<AdminUsersState>({ ...EMPTY }),
  withHydrationState(),
  withComputed(({ users }) => ({
    /**
     * Administrators who could sign in right now — the server's own `enabledAdminCount`, mirrored so
     * the panel can grey out a control that would be refused instead of offering it and reporting a
     * 409. The server is still what enforces it.
     */
    enabledAdminCount: computed(
      () => users().filter((user) => user.role === 'admin' && !user.disabled).length,
    ),
  })),
  withMethods((store) => {
    const api = inject(AdminUsersApiService);
    const session = inject(SessionStore);
    /** Swaps one account for the version the server just answered with. */
    const replace = (updated: AdminUser): void => {
      patchState(store, {
        users: store.users().map((user) => (user.id === updated.id ? updated : user)),
      });
    };

    /**
     * `hydrate` is idempotent and triggered on first injection (`withHooks` below,
     * TICKET-PERF-07); `retry` is the panel's "try again" and `reset` the sign-out wipe
     * (TICKET-SRV-06, TICKET-AUTH-02). The message mapper is this store's alone: its reads go
     * through `AdminUsersApiService` rather than `ApiClient`, so a failure arrives as a raw
     * `HttpErrorResponse` that only `authErrorMessage` can turn into a sentence.
     *
     * It asks nothing of the server for a non-admin. That is not a permission check (the server's
     * `requireAdmin` is), it is about `rehydrateAll`: signing in as an ordinary user in a tab where
     * an admin had the panel open would otherwise fire a call that can only ever answer 403.
     */
    const { hydrate, retry, reset } = createHydration(
      store,
      async () => {
        if (session.user()?.role !== 'admin') return;
        patchState(store, { users: await api.list() });
      },
      (error) => authErrorMessage(error, LOAD_FAILED),
    );

    return {
      reset,
      hydrate,
      retry,

      /**
       * Creates an account, which the server also seeds with its default categories, mapping
       * profiles and transfer settings. Resolves `null` on success, or the message to show — a
       * duplicate email is a 409 whose wording is the server's.
       */
      createAccount: async (account: NewAccount): Promise<string | null> => {
        try {
          patchState(store, { users: [...store.users(), await api.create(account)] });
          return null;
        } catch (error) {
          return authErrorMessage(error, CREATE_FAILED);
        }
      },

      /**
       * Renames, promotes/demotes or disables/enables one account. Resolves `null` on success, or the
       * server's reason for refusing — the last-administrator and not-yourself rules all land here.
       */
      saveChanges: async (id: number, changes: AdminUserChanges): Promise<string | null> => {
        try {
          replace(await api.update(id, changes));
          return null;
        } catch (error) {
          return authErrorMessage(error, SAVE_FAILED);
        }
      },

      /**
       * Sets somebody else's password. Resolves `null` on success — the password itself is *not*
       * returned through here: the dialog already has the value it sent, and passing it back out of
       * the store would put a plaintext password into shared state for no reason.
       */
      resetPassword: async (id: number, password: string): Promise<string | null> => {
        try {
          replace(await api.resetPassword(id, password));
          return null;
        } catch (error) {
          return authErrorMessage(error, RESET_FAILED);
        }
      },

      /** Deletes an account and every row it owns. Resolves `null` on success. */
      deleteAccount: async (id: number): Promise<string | null> => {
        try {
          await api.remove(id);
          patchState(store, { users: store.users().filter((user) => user.id !== id) });
          return null;
        } catch (error) {
          return authErrorMessage(error, DELETE_FAILED);
        }
      },
    };
  }),
  withHooks({
    onInit(store) {
      // Registers this store for the sign-out wipe (TICKET-AUTH-02) — it holds every account's
      // email, which is exactly what the next person to sign in must not find sitting in memory.
      registerStoreReset('AdminUsersStore', store.reset, store.hydrate);

      // `.catch` because nothing awaits this: the failure is already on the store's `error` for the
      // page to render, and un-caught it would be an unhandled rejection too (TICKET-SRV-06).
      void store.hydrate().catch(() => undefined);
    },
  }),
);
