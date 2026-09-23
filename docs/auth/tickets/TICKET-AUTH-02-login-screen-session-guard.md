# TICKET-AUTH-02 — Login screen, session store, and a guarded app

- **Area:** Auth & Accounts
- **Released in:** _unreleased_
- **Type:** Feature
- **Traceability:** new — extends [`ui-layout-spec.md`](../../reference/ui-layout-spec.md) with a pre-shell route; planned for v3

## User story

As a household member opening Money Mosaic, I want a login screen before anything else and a way to sign out again, so the app knows who I am and I can hand the laptop to someone else without handing over my finances.

## Description

The client half of [TICKET-AUTH-01](./TICKET-AUTH-01-users-seeded-admin-login.md): a `feature-auth` area with a `/login` route, a `SessionStore` holding the signed-in user, a route guard in front of every existing route, and a 401 interceptor that sends an expired session back to the login screen.

## Current situation (as-is)

- [`app.routes.ts`](../../../src/app/app.routes.ts) has no guards; every route loads straight into the shell. `AppShellComponent` is lazily loaded from `core/layout` (see the comment in [`app.config.ts`](../../../src/app/app.config.ts) about why that barrel is bypassed).
- There is no `HttpClient` provider and no interceptor in `app.config.ts` — the app has never made an HTTP call.
- Signal stores hydrate themselves on first injection via `withHooks({ onInit })` (TICKET-PERF-07), so store state is created per browser session and never torn down. **Nothing in the app can currently reset a store**, which is the interesting part of this ticket rather than the login form.

## Desired result (to-be)

- **`feature-auth/`** following the standard feature layout, exporting through an `index.ts` barrel:
  - `LoginPageComponent` at **`/login`** — a full-page, shell-free layout (no sidebar, no nav) with email + password fields, a submit button with a pending state, and one error line for a failed sign-in. It uses the app's daisyUI tokens like every other surface; no bespoke colours.
  - `SessionStore` (`@ngrx/signals`) holding `user: PublicUser | null`, `status: 'unknown' | 'authenticated' | 'anonymous'`, and `error`. Methods: `restore()` (calls `GET /api/auth/me`), `login(email, password)`, `logout()`. Following the `DEFAULT_*`/`withState` convention, **every key is declared in the initial state** — an omitted key makes a later `patchState` unreadable.
- **`authGuard`** (a `CanActivateFn`) on every route in `app.routes.ts` except `/login`. On `status === 'unknown'` it awaits `restore()` first, so a hard refresh on a deep link does not bounce a signed-in user to the login screen. On `anonymous` it redirects to `/login` **carrying the attempted URL**, and the login page returns there on success.
- **`HttpClient` is provided** in `app.config.ts` with `withFetch()` and an interceptor that:
  - sends credentials so the session cookie rides along, and
  - on any **401** from an `/api` call, clears the session and routes to `/login`. A 401 from `GET /api/auth/me` during `restore()` is the normal signed-out case and must **not** trigger the redirect loop.
- **Sign out** lives in the app shell's user area: the signed-in user's display name, and a "Sign out" action that calls `logout()` and lands on `/login`.
- **Signing out clears client state.** Every hydrating store exposes a reset, and logout calls them all before navigating — otherwise the next person to sign in on the same browser sees the previous user's accounts and transactions rendered from memory until each store happens to re-hydrate. A single `StoreResetService` (or an injection-token-collected list of resettable stores) owns this so a store added later cannot be silently forgotten.
- **The login page is lazily loaded** and pulls in none of the shell, its icons, or the feature stores.

## Acceptance criteria

- [ ] Visiting any route while signed out redirects to `/login`, and signing in returns to the **originally requested URL**, not the dashboard.
- [ ] A hard refresh while signed in lands on the requested route without a flash of the login screen — the guard awaits `restore()` on `status === 'unknown'`.
- [ ] A failed sign-in shows the server's message inline and leaves the form usable; the password field is cleared.
- [ ] A 401 from any `/api` call other than `me` clears the session and routes to `/login`; a 401 from `me` during `restore()` does not.
- [ ] Sign out calls `POST /api/auth/logout`, clears `SessionStore`, and lands on `/login`.
- [ ] **After sign-out, no store holds the previous user's data**: a test signs in as A, hydrates the account and transaction stores, signs out, signs in as B, and asserts both stores are empty before B's own hydration completes.
- [ ] A store that is added without registering for reset is caught — a test enumerates the resettable-store registry against the stores the shell hydrates and fails on a gap.
- [ ] `ng build --configuration development` shows `/login` in its own lazy chunk, and the initial bundle grows by no more than the guard, interceptor, and session store. The `angular.json` budgets are **not** raised.
- [ ] Unit tests cover: guard redirect with return URL, guard pass-through when authenticated, guard awaiting an unknown session, interceptor 401 handling for both cases, `SessionStore` login success/failure/logout transitions, and the store-reset-on-logout case above.
- [ ] Verified via the fallow skill and coding-conventions skill.
- [ ] Verified live in the browser: sign in as `admin` / `admin`, deep-link to `/transactions`, refresh, sign out, and confirm the app returns to `/login` with no data visible.

## Notes

- **The store reset is the risky half of this ticket, not the form.** Every store in the app was written on the assumption that one browser means one dataset for the lifetime of the tab. That assumption dies here, and the failure mode — user B seeing user A's balances — is the worst one in the whole version, so it gets its own acceptance criterion and its own registry test.
- `/login` must stay outside the shell. Rendering it inside `AppShellComponent` would make the nav, stores, and icons eager for a signed-out visitor, defeating the lazy-shell decision `app.config.ts` documents.
- Depends on [TICKET-AUTH-01](./TICKET-AUTH-01-users-seeded-admin-login.md) for the endpoints, and therefore on [TICKET-SRV-01](../../server/tickets/TICKET-SRV-01-express-sqlite-drizzle-skeleton.md).
