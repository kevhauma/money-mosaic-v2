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

## Review fixes (2026-09-28)

The `conventions-reviewer` pass confirmed the guard genuinely awaits an unknown session rather than
letting a navigation through optimistically, that the server — not the guard — is the real
boundary, that the 17 store edits are uniform and behaviour-preserving, and that no barrel dragged
the login page or Dexie eager. Four real defects, all in the session lifecycle.

1. **Signing in did not wipe the stores — only signing *out* did.** `/login` has no guard, so a
   second person could reach it with the first's session still live, sign in, and land on a
   dashboard rendering the previous user's accounts, transactions, income and loans. `rehydrateAll`
   was not a defence: `hydrate()` is memoised, so on an already-hydrated store it is a no-op and
   the old rows simply stayed. `login()` now calls `resetAll()` unconditionally before adopting the
   new identity, with a regression test confirmed to fail without it.
2. **A stale `me` could overwrite a newer session.** Neither `restore()` callback checked it was
   still the current attempt, so a slow 401 landing after a successful sign-in patched the fresh
   session back to anonymous — leaving the tab signed out against a valid cookie, and `'anonymous'`
   rather than `'unknown'` meant no guard would ever ask again. Only a reload recovered. Both
   callbacks now check generation, and the signed-out path routes through `clearSession()` so it
   cannot skip the wipe.
3. **The interceptor's 401 redirect dropped the return URL and could fire once per parallel
   request.** It now carries `returnUrl` the same way the guard does, and redirects once.
4. **URL matching was raw string comparison** against relative constants, so an absolute API URL
   would have got neither `withCredentials` nor the 401 exemption — an unauthenticated request that
   then looks like an expired session, which is a redirect loop. Both now compare pathnames.

The registry scan was also inverted to start from **every** `signalStore` rather than only those
matching the memoised-hydration shape, each of which must now either register or appear on a
commented exemption list — turning "forgot" into "must justify". A second case keeps the exemption
list itself from going stale. Writing it found two stores the original scan could not see.

See also the scope note in the Notes section: the wipe is in-memory only, and this ticket's user
story is not fully delivered until TICKET-SRV-05 moves entity data server-side.

## Acceptance criteria

> **Implementation notes — 2026-09-25**, recorded where the build diverged from the to-be section above:
>
> - **`SessionStore`, `authGuard` and `authInterceptor` live in `core/auth/`, not `feature-auth/`.** The guard and the interceptor are eager, and `feature-auth`'s barrel exports `LoginPageComponent` — importing the session through it would pull the login page (and, via `@/core/state`, Dexie and every entity store) into the initial bundle, which is precisely what the second note below the criteria forbids. `feature-auth/` is the lazily-loaded `/login` route and its page, nothing else.
> - **`PublicUser` is hand-mirrored** in [`core/auth/public-user.ts`](../../../src/app/core/auth/public-user.ts) rather than moved into the repo-root `shared/` workspace. `shared/` is for what both sides *persist* (the entity types Dexie and Drizzle agree on); this is a wire shape the server owns and the client reads, so two small declarations are the honest seam. `server/src/types.ts` already records the same decision from its end.
> - **The interceptor exempts `POST /api/auth/login` as well as `GET /api/auth/me`** (criterion 4 names only `me`). A 401 from `login` is a rejected password, which the form reports inline; clearing the session and navigating on it would also throw away the `returnUrl` the login page is holding.
> - **`StoreResetService` gained a second method, `rehydrateAll()`**, called on a successful sign-in. A store hydrates from its *first* injection, which has long since happened by the time a second user signs in on the same tab — without it the stores emptied at sign-out would stay empty until a full reload.
> - **`mm-input` gained a `password` type and an `autocomplete` input** — the typed-union extension the Open/Closed convention prescribes. A login form with no autofill hints is one no password manager can fill.

- [x] Visiting any route while signed out redirects to `/login`, and signing in returns to the **originally requested URL**, not the dashboard. (`authGuard` in [`core/auth/auth.guard.ts`](../../../src/app/core/auth/auth.guard.ts) on all three top-level entries of `app.routes.ts`; proven by `auth.guard.spec.ts` "sends a signed-out visitor to /login carrying the URL it stopped", `app.routes.spec.ts` "sends a signed-out visitor from a deep link to /login, carrying the URL they asked for" (`/login?returnUrl=%2Ftransactions`), and `login-page.component.spec.ts` "lands on the URL the guard stopped, rather than the dashboard")
- [x] A hard refresh while signed in lands on the requested route without a flash of the login screen — the guard awaits `restore()` on `status === 'unknown'`. (`auth.guard.spec.ts` "awaits restore() on an unknown session, so a hard refresh does not bounce to /login" holds the `me` response open and asserts the guard is still pending, then resolves to `true`)
- [x] A failed sign-in shows the server's message inline and leaves the form usable; the password field is cleared. (`login-page.component.spec.ts` "shows the server's message inline, keeps the form usable and clears the password" — asserts the `mm-alert` text is the server's own `Incorrect email or password`, the password input is `''`, the email is kept and the submit button is not disabled)
- [x] A 401 from any `/api` call other than `me` clears the session and routes to `/login`; a 401 from `me` during `restore()` does not. (`auth.interceptor.spec.ts`: a 401 from `/api/accounts` leaves `status === 'anonymous'` and calls `navigate(['/login'])`; a 401 from `/api/auth/me` leaves an authenticated session untouched. `POST /api/auth/login` is exempt too — see the implementation note above)
- [x] Sign out calls `POST /api/auth/logout`, clears `SessionStore`, and lands on `/login`. (`app-shell.component.spec.ts` "signs out through the API, clears the session and lands on /login" clicks the shell's Sign out button; `session.store.spec.ts` covers the store transition, including the unreachable-server case)
- [x] **After sign-out, no store holds the previous user's data _in memory_** (see the scope note below — the IndexedDB behind them is untouched until TICKET-SRV-05): a test signs in as A, hydrates the account and transaction stores, signs out, signs in as B, and asserts both stores are empty before B's own hydration completes. (`core/store-reset/store-reset.service.spec.ts` "empties the account and transaction stores at sign-out, and refills them for the next user" — B's repository promises are held open across the assertion, then released to prove a reset store is not a permanently empty one)
- [x] A store that is added without registering for reset is caught — a test enumerates the resettable-store registry against the stores the shell hydrates and fails on a gap. (`core/store-reset/store-reset-registry.spec.ts` reads every `*.store.ts` under `src/app`, treats the memoised `let hydration` as the definition of "hydrating", and fails on any such file missing `registerStoreReset(`/`createStoreReset(`. Source-level rather than runtime: a store nobody injected is invisible to a runtime registry, and that is exactly the store this must catch. All 17 hydrating stores register)
- [x] `ng build --configuration development` shows `/login` in its own lazy chunk, and the initial bundle grows by no more than the guard, interceptor, and session store. The `angular.json` budgets are **not** raised. (dev build lists a `login-page-component` lazy chunk; initial total 2.17 MB → 2.28 MB unoptimised, and the production build 851.94 kB → 877.89 kB raw / 158.43 → 165.87 kB transfer — the whole delta is `@angular/common/http` plus the guard, interceptor and session store. `angular.json` is untouched; the pre-existing 500 kB initial warning is unchanged in kind)
- [x] Unit tests cover: guard redirect with return URL, guard pass-through when authenticated, guard awaiting an unknown session, interceptor 401 handling for both cases, `SessionStore` login success/failure/logout transitions, and the store-reset-on-logout case above. (38 new cases across `auth.guard.spec.ts` (4), `auth.interceptor.spec.ts` (6), `session.store.spec.ts` (10), `store-reset.service.spec.ts` (4), `store-reset-registry.spec.ts` (3), plus `login-page.component.spec.ts` (5), `app.routes.spec.ts` (3) and `app-shell.component.spec.ts` (3). Full suite: 313 files / 3640 tests green)
- [x] Verified via the fallow skill and coding-conventions skill. (`npx fallow dead-code --baseline .fallow-baseline.json --fail-on-issues --quiet` and `npx fallow health --complexity --max-cognitive 30 --max-cyclomatic 30 --max-crap 1000 --fail-on-issues --quiet` both exit 0; the diff was reviewed against `.claude/skills/coding-conventions/SKILL.md`, which this ticket also extends with an **HTTP** section and the store-reset rule)
- [ ] Verified live in the browser: sign in as `admin` / `admin`, deep-link to `/transactions`, refresh, sign out, and confirm the app returns to `/login` with no data visible. — not ticked: browser verification waived by the user for the v3 server/auth run

## Notes

- **The store reset is the risky half of this ticket, not the form.** Every store in the app was written on the assumption that one browser means one dataset for the lifetime of the tab. That assumption dies here, and the failure mode — user B seeing user A's balances — is the worst one in the whole version, so it gets its own acceptance criterion and its own registry test.
- **What the wipe actually achieves, stated plainly (2026-09-25 review).** It empties **in-memory signal state** and clears each store's memoised hydration promise. Entity data stays in the single un-namespaced `money-mosaic` IndexedDB, so the next person to sign in rehydrates from the same database and sees the previous user's rows again. The acceptance criterion above passes because the spec substitutes mocked repositories for the Dexie-backed ones — it proves the reset plumbing, not per-user storage.

  So **this ticket's user story is not fully delivered by this ticket**: until [TICKET-SRV-05](../../server/tickets/TICKET-SRV-05-repositories-over-http.md) moves entity data server-side, sign-out is a UI boundary rather than a data boundary, and anyone who opens devtools can read the previous user's figures whatever the guard says. That is the right sequencing — the reset plumbing is what SRV-05 needs in place — but it should not read as though the hole were closed here. Closing it early would mean wiping IndexedDB at sign-out, which on a local-first app destroys the user's only copy; that is a product decision, not a review fix.
- `/login` must stay outside the shell. Rendering it inside `AppShellComponent` would make the nav, stores, and icons eager for a signed-out visitor, defeating the lazy-shell decision `app.config.ts` documents.
- Depends on [TICKET-AUTH-01](./TICKET-AUTH-01-users-seeded-admin-login.md) for the endpoints, and therefore on [TICKET-SRV-01](../../server/tickets/TICKET-SRV-01-express-sqlite-drizzle-skeleton.md).
