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
- **A shared loading and error presentation** so twenty features do not invent twenty spinners: a small wrapper the page-level components use around content that depends on a hydrating store, rendering the app's existing skeleton treatment while loading and a compact "couldn't load this — retry" on failure. Panels already handle an empty dataset; this is about the state *before* empty is known.
- **A `retry()` on each store**, so a failed hydration is recoverable without a page reload.
- **Requests are not retried automatically**, with one exception: a **single** immediate retry on a transport failure, which covers the common case of the server having just restarted. Anything beyond that is the user pressing Retry — silent retry loops against a box that is switched off produce a hung UI and a noisy log.
- **`StorageStatusService` is left in place but no longer called from bootstrap.** It is deleted in [TICKET-SRV-08](./TICKET-SRV-08-retire-dexie.md) along with the rest of the IndexedDB apparatus; removing its call here is enough to stop the app asking for a storage permission it no longer needs.

## Acceptance criteria

- [ ] With the server stopped, loading the app shows the "can't reach the server" screen — not a blank page, not a spinner that never ends, and no unhandled console error.
- [ ] Pressing Retry after starting the server recovers without a manual page reload.
- [ ] A signed-in user whose session is still valid does not see the login screen when the server is merely slow — the guard awaits `restore()` and distinguishes "unreachable" from "unauthenticated".
- [ ] An HTTP 4xx/5xx does **not** flip the app into the unreachable state; only a transport failure does. Both cases are tested.
- [ ] Every store that hydrates has `loading` and `error` in its initial state, all keys declared — asserted by a test enumerating the hydrating stores and checking their initial state shape, so a new store cannot omit them.
- [ ] A store whose hydration fails renders the compact error with a working retry, and retrying re-issues exactly one request.
- [ ] A transport failure is retried once, automatically, and not more — asserted by counting requests.
- [ ] Bootstrap no longer touches `appDb` or `StorageStatusService`; `provideAppInitializer` resolves only the session.
- [ ] No route renders content derived from an un-hydrated store — the loading state is shown instead of a zero, an empty chart, or "no transactions" that is really "not loaded yet". This is checked on the dashboard, transactions and income pages at minimum.
- [ ] Unit tests cover: bootstrap failure, bootstrap success, `ServerStatusService` transitions for transport vs HTTP errors, per-store loading/error/retry, and the single-retry rule.
- [ ] Verified via the fallow skill and coding-conventions skill.
- [ ] Verified live in the browser: load the app with the server down, start the server, press Retry, then stop the server mid-session and confirm the next action reports the outage rather than appearing to succeed.

## Notes

- **"Empty" and "not loaded" look identical today and that is the real hazard.** A dashboard that renders zero income because hydration failed is worse than one that renders an error — the user believes the number. That is why an explicit criterion covers it rather than leaving it to each panel.
- **Offline support is explicitly not in scope.** No service worker, no write queue, no local cache of server data. The app requires the server, the same way it required a browser with IndexedDB before. If offline-capable operation is wanted later it is its own version, and it will want the local database back as a cache — which is a reason to keep [TICKET-SRV-08](./TICKET-SRV-08-retire-dexie.md)'s deletions clean and reviewable rather than scattered.
- Sequenced immediately after [TICKET-SRV-05](./TICKET-SRV-05-repositories-over-http.md) and should not be deferred past it: between the two, an unreachable server gives a blank screen.
