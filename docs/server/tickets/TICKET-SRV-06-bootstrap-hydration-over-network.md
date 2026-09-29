# TICKET-SRV-06 — Bootstrap and hydration over a network that can fail

- **Area:** Server
- **Released in:** _unreleased_
- **Type:** Feature
- **Traceability:** replaces NFR-STORE-1 / FR-DAT-4 (persistent local storage) with a server-availability contract; planned for v3

## User story

As someone whose home server is switched off, I want Money Mosaic to tell me it cannot reach the server and offer to retry, so I get an explanation instead of a blank page.

## Description

IndexedDB never failed. The server can be down, restarting, or unreachable, and after [TICKET-SRV-05](./TICKET-SRV-05-repositories-over-http.md) every screen in the app depends on it. This ticket gives bootstrap and per-store hydration real loading and failure states, and replaces the Dexie-specific startup work in `app.config.ts`.

## Current situation (as-is)

- [`app.config.ts`](../../../src/app/app.config.ts)'s `provideAppInitializer` calls `appDb.open()` and, once open, fires `StorageStatusService.checkAndRequest()` (fire-and-forget, FR-DAT-4) and the dev-only seed. **There is no failure path** — the comment in the file explains the storage request is never awaited specifically so it cannot delay bootstrap, and `appDb.open()` failing was never considered because it does not happen.
- Every store hydrates itself on first injection via `withHooks({ onInit })` (TICKET-PERF-07) — whichever route injects it first kicks off its hydration. Those hydrations are all `await repository.getAll()` against a local database, so they resolve effectively instantly and **no store models a loading or error state**.
- [`storage-status.service.ts`](../../../src/app/core/storage/storage-status.service.ts) asks the browser for persistent storage so IndexedDB is not evicted — meaningless once the data is on a server.
- The app has no offline story because it has never needed one: everything was offline.

## Desired result (to-be)

- **Bootstrap no longer opens a database.** `provideAppInitializer` resolves the session ([TICKET-AUTH-02](../../auth/tickets/TICKET-AUTH-02-login-screen-session-guard.md)'s `restore()`) and nothing else. Data loads per store, per route, as it already does.
- **A `ServerStatusService`** owns one piece of state — reachable, unreachable, or checking — fed by the `ApiClient`'s error handling. A transport-level failure (connection refused, DNS, timeout) flips it to unreachable; any successful response flips it back. An HTTP **error status** is a normal response, not an outage, and must not.
- **A full-screen "can't reach the server" state** when bootstrap itself fails, explaining what is probably wrong (the server is not running; the address changed), showing the API base URL, and offering **Retry**. It is a plain component with no store dependencies, since the thing that failed is the reason the stores are empty.
- **Every hydrating store gains `loading` and `error` state**, following the existing `withState` convention — **every key declared in the initial state**, since an omitted key makes a later `patchState` unreadable (the `DEFAULT_APP_SETTINGS` gotcha, already recorded in the data-model skill). `onInit` hydration sets `loading`, clears it on success, and records the message on failure.
- **A shared loading and error presentation** so twenty features do not invent twenty spinners: a small wrapper the page-level components use around content that depends on a hydrating store, rendering the app's existing skeleton treatment while loading and a compact "couldn't load this — retry" on failure. Panels already handle an empty dataset; this is about the state _before_ empty is known.
- **A `retry()` on each store**, so a failed hydration is recoverable without a page reload.
- **Requests are not retried automatically**, with one exception: a **single** immediate retry on a transport failure, which covers the common case of the server having just restarted. Anything beyond that is the user pressing Retry — silent retry loops against a box that is switched off produce a hung UI and a noisy log.
- **`StorageStatusService` is left in place but no longer called from bootstrap.** It is deleted in [TICKET-SRV-08](./TICKET-SRV-08-retire-dexie.md) along with the rest of the IndexedDB apparatus; removing its call here is enough to stop the app asking for a storage permission it no longer needs.

## Acceptance criteria

**Implementation note (2026-09-29).** Three decisions taken while building, each departing from the
to-be section above:

1. **`ServerStatusService` is fed by an interceptor, not by `ApiClient`.** The to-be section names
   `ApiClient` as the feed. It cannot be the only one: `GET /api/auth/me` — the request bootstrap
   itself depends on — goes out through `AuthApiService`, which sits beside `ApiClient` rather than
   under it. `serverStatusInterceptor` sees every `/api` call, so one rule covers the sixteen store
   hydrations _and_ the one request that decides whether the app starts at all.
2. **The single automatic retry is limited to safe methods (`GET`/`HEAD`/`OPTIONS`).** A transport
   failure says the _response_ never arrived; it does not say the request never landed. Re-sending a
   `POST /api/transactions` on that evidence is how one import becomes two. Every read — which is
   what "the server just restarted" actually breaks — is retried once; a write that fails is the
   user's to retry, from a button that tells them it failed. The criterion below is ticked against
   that narrower rule, and both halves are tested.
3. **`ApiClient` rejects a status-0 response with `ServerUnreachableError`** rather than the flat
   `Error` it makes of every other failure, so "nothing answered" survives the trip up to the store
   that has to word it. Without it every store would show
   `Http failure response for /api/accounts: 0 Unknown Error`.

- [x] With the server stopped, loading the app shows the "can't reach the server" screen — not a blank page, not a spinner that never ends, and no unhandled console error. (`app-bootstrap.ts` catches a bootstrap rejected by a transport failure and bootstraps `ServerUnreachableComponent` into its own host element; `app-bootstrap.spec.ts` → "shows the 'can't reach the server' screen instead of a blank page" drives the real `appConfig` with a rejecting `fetch` and finds the screen, its explanation and the API URL. The whole suite runs with zero unhandled rejections, which is what the `.catch` on every `onInit` hydration and on `rehydrateAll` buys.)
- [x] Pressing Retry after starting the server recovers without a manual page reload. (`app-bootstrap.spec.ts` → "recovers on Retry once the server is back, without a page reload": with `fetch` failing, presses the screen's own button, restores `fetch`, and finds the real app mounted in `<app-root>` with the failure screen gone. `location.reload()` is deliberately not used — the host tears its tiny application down and calls `startApp` again.)
- [x] A signed-in user whose session is still valid does not see the login screen when the server is merely slow — the guard awaits `restore()` and distinguishes "unreachable" from "unauthenticated". (`SessionStore.restore` now rejects on a transport failure and leaves `status` at `'unknown'` instead of calling `clearSession()`; `auth.guard.ts` returns `false` in that case rather than redirecting. Tests: `session.store.spec.ts` → "rejects rather than signing anybody out when the server does not answer" and "forgets an unanswered restore"; `auth.guard.spec.ts` → "does not claim an unreachable server means signed out", "lets the same visitor through once the server answers again", and the pre-existing "awaits restore() on an unknown session" for the merely-slow case.)
- [x] An HTTP 4xx/5xx does **not** flip the app into the unreachable state; only a transport failure does. Both cases are tested. (`server-status.interceptor.spec.ts` → "does not flip to unreachable on a 4xx or a 5xx — those are answers" (404/409/500) and "flips to unreachable when nothing answers at all"; the predicate itself is pinned by `transport-failure.spec.ts`.)
- [x] Every store that hydrates has `loading` and `error` in its initial state, all keys declared — asserted by a test enumerating the hydrating stores and checking their initial state shape, so a new store cannot omit them. (`core/store-reset/hydration-state.spec.ts` instantiates all eighteen and asserts both keys are present in `getState`, then compares that list against every `.store.ts` in the source tree that calls `createHydration`, so adding a store without them fails here. `store-reset-registry.spec.ts` gained the matching source-level check that each composes `withHydrationState()`.)
- [x] A store whose hydration fails renders the compact error with a working retry, and retrying re-issues exactly one request. (`mm-hydration-boundary` renders the message and a "Try again" button — `hydration-boundary.component.spec.ts`. End to end on a page: `transactions-overview.component.spec.ts` → "reports the failure with a retry instead of 'No transactions match'" asserts `getAll` was called exactly twice across the initial load and the retry. `with-hydration.spec.ts` covers the store half: one read per press, the error cleared while in flight, and a retry that never rejects.)
- [x] A transport failure is retried once, automatically, and not more — asserted by counting requests, **for safe methods only** (see implementation note 2 above). (`server-status.interceptor.spec.ts` → "retries a failed read exactly once, and no more" (two requests, then `HttpTestingController.verify()` proves there is no third), "gives up after one retry rather than looping", "recovers when the retry succeeds", and "does not retry a write: a transport failure is no evidence the write did not land".)
- [x] Bootstrap no longer touches `appDb` or `StorageStatusService`; `provideAppInitializer` resolves only the session. (`app.config.ts` is now `provideAppInitializer(() => inject(SessionStore).restore())` and imports neither; `app-bootstrap.spec.ts` → "app.config.ts: bootstrap resolves the session and nothing else" reads the file and asserts both absences plus exactly one initializer. The dev-only seed moved to `AppShellComponent`'s constructor, the earliest point at which somebody is signed in. `appDb` is now referenced by nothing — kept, with a `fallow-ignore` naming TICKET-SRV-07 as its remaining reader.)
- [x] No route renders content derived from an un-hydrated store — the loading state is shown instead of a zero, an empty chart, or "no transactions" that is really "not loaded yet". This is checked on the dashboard, transactions and income pages at minimum. (All three wrap their body in `mm-hydration-boundary` fed by `hydrationOf(...)` over the stores they read. Tests: `dashboard-overview.component.spec.ts` → "shows the loading skeleton rather than the empty state while transactions are still hydrating" and "reports a failed load rather than 'No transactions yet'"; `transactions-overview.component.spec.ts` → "reports the failure with a retry instead of 'No transactions match'"; `income-overview.component.spec.ts` → "reports the failure with a retry instead of 'No income is being counted yet'". Each asserts the empty state is _absent_, which is the half that matters.)
- [x] Unit tests cover: bootstrap failure, bootstrap success, `ServerStatusService` transitions for transport vs HTTP errors, per-store loading/error/retry, and the single-retry rule. (New: `app-bootstrap.spec.ts`, `core/server-status/server-status.interceptor.spec.ts`, `core/server-status/transport-failure.spec.ts`, `core/server-status/server-unreachable/server-unreachable.component.spec.ts`, `core/store-reset/with-hydration.spec.ts`, `core/store-reset/hydration-state.spec.ts`, `shared/utils/hydration-status.spec.ts`, `shared/ui/hydration-boundary/hydration-boundary.component.spec.ts`. `ng test`: 340 files / 3872 tests, all passing, no unhandled rejections.)
- [x] Verified via the fallow skill and coding-conventions skill. (Both CI gates exit 0: `npx fallow dead-code --baseline .fallow-baseline.json --fail-on-issues --quiet` and `npx fallow health --complexity --max-cognitive 30 --max-cyclomatic 30 --max-crap 1000 --fail-on-issues --quiet`. Two findings were answered with inline `fallow-ignore-next-line` comments carrying reasons rather than a raised threshold: `appDb`, unreferenced until TICKET-SRV-07 reads it, and `ServerUnreachableComponent`, which is rendered by `ApplicationRef.bootstrap` and so by no template. Conventions: `ng lint` clean, Prettier clean, and `.claude/skills/coding-conventions/SKILL.md` + `project-map/SKILL.md` updated with the hydration pattern and the new `core/server-status` module.)
- [ ] Verified live in the browser: load the app with the server down, start the server, press Retry, then stop the server mid-session and confirm the next action reports the outage rather than appearing to succeed. — not ticked: browser verification waived for this run (ticket worked head-down, no browser). The scenario is covered programmatically by `app-bootstrap.spec.ts` (server down → screen → Retry → app) and by the mid-session case in the three page specs, but nobody has watched it happen.

## Notes

- **"Empty" and "not loaded" look identical today and that is the real hazard.** A dashboard that renders zero income because hydration failed is worse than one that renders an error — the user believes the number. That is why an explicit criterion covers it rather than leaving it to each panel.
- **Offline support is explicitly not in scope.** No service worker, no write queue, no local cache of server data. The app requires the server, the same way it required a browser with IndexedDB before. If offline-capable operation is wanted later it is its own version, and it will want the local database back as a cache — which is a reason to keep [TICKET-SRV-08](./TICKET-SRV-08-retire-dexie.md)'s deletions clean and reviewable rather than scattered.
- Sequenced immediately after [TICKET-SRV-05](./TICKET-SRV-05-repositories-over-http.md) and should not be deferred past it: between the two, an unreachable server gives a blank screen.

### Review notes (2026-09-29)

Changed after the `conventions-reviewer` pass, before the commit. The reviewer confirmed the parts
that matter most were right: a 401 cannot be misread as an outage nor an outage as a sign-out, the
GET/HEAD/OPTIONS retry limit is genuinely enforced rather than merely documented (RxJS short-circuits
`retry` to `identity` at `count: 0`, so no write can be double-submitted and the retry cannot stack
with a store's own), all 18 stores place `withHydrationState()` before the `withMethods` block that
consumes it, and both fallow suppressions satisfy the house rule. What it found:

- **`StorageStatusService` had stopped being called at all.** Moving `checkAndRequest()` out of
  `app.config.ts` left nothing invoking it, and its status signal is only ever written by that call —
  so the Data management page's persistent-storage panel reported "not supported" on every browser,
  regardless of the truth, and FR-DAT-4's request stopped being made. The page that shows the answer
  now asks the question, in its constructor. **No spec covered it, which is why it was invisible**;
  one does now.
- **A failed bootstrap leaked its entire environment injector, and every Retry added another.**
  Angular registers `envInjector.destroy()` only as a platform-destroy listener and re-throws a
  rejected initializer without firing it, so the injector, its root singletons and its environment
  initializers all survived a failed boot — including the global error listeners, meaning the third
  attempt would have reported every later error three times over. `startApp` now destroys the
  platform before showing the screen.
- **The Retry blanked the page for the length of the attempt.** The host tore the screen down
  _before_ re-bootstrapping, so "Retrying…" survived about one frame — fine against a refused
  connection, but against a server that accepts the socket and never answers (the outage this screen
  exists for) it meant a blank white page for the whole timeout. The screen now stays up until the
  attempt resolves, which is what its own doc comment already claimed.
- **A programming error inside a store's `load` reached the user and not the console.** `onInit`'s
  fire-and-forget `.catch` swallows everything, so a `TypeError` from a renamed repository method was
  rendered verbatim under "Try again" with its stack discarded — a debuggability regression against
  the bare `void store.hydrate()` it replaced. Anything that is not an HTTP answer or an outage is
  now logged from the one place that knows which it was.
- **`ApiClient` was a second place the status-0 distinction was made**, written with the exact
  `instanceof HttpErrorResponse` check that `httpStatusOf` exists to work around — so under the test
  runner's dual-copy pre-bundling the two modules disagreed about what counts as an HTTP failure, and
  a 500 would have reached the user as HttpClient's prose instead of the server's. Both now go
  through `httpStatusOf`.
- **The new "don't hand-roll hydration" convention had no test behind it.** Swapping the registry's
  marker from `let hydration` to `createHydration(` meant the loading/error checks only ever ran over
  stores that already complied — they could not fail. A third source-level assertion now rejects the
  hand-rolled shape outright.
- Smaller: the shell's outage banner re-authored daisyUI markup instead of using `mm-alert`;
  `main.ts` had lost the `.catch` that is the floor under the failure path itself; a doc comment on
  the dashboard had been stranded above the wrong field; two comments said "sixteen stores" where the
  count is eighteen; `hydration-state.spec.ts` was renamed to `hydrating-stores.spec.ts`, since the
  file it sat beside did not exist.

Recorded rather than changed:

- **The guards' `return false` renders nothing.** `authGuard` is on the shell route, so a cancelled
  navigation means no shell, no outage banner and a blank page with nothing to click. It is
  unreachable after a successful bootstrap — the initializer settles the session before anything
  renders — so this is latent, not live. Both guards now say so explicitly, including what the next
  person owes it if they make it reachable.
- **A red `console.error` still appears on the unreachable path.** Angular reports the rejected
  initializer to its own `ErrorHandler` before `startApp`'s `catch` runs, so the friendly screen is
  accompanied by `ERROR HttpErrorResponse {status: 0 …}`. It is _handled_, not unhandled, and
  suppressing it would mean a custom `ErrorHandler` — out of scope here, but worth knowing during the
  browser check so it is not mistaken for a new fault.
- The two import-throughput items SRV-05's review raised (`commitImport` downloading a whole account
  twice per import, and the dedupe read sitting outside the commit transaction) remain open. This
  ticket's scope is failure and loading states, not throughput.

For TICKET-SRV-08: `data-model/SKILL.md` line 8 — "`app.config.ts` opens it and hydrates all stores
in `provideAppInitializer` before render" — is now false in both halves. `core/storage/` is also
reduced to a single page's dependency.
