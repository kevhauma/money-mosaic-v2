# TICKET-DAT-02 — Request persistent browser storage

- **Area:** Data Management
- **Type:** Feature
- **Traceability:** FR-DAT-4

## User story

As a user, I want the app to request persistent storage from my browser, so it doesn't silently evict my financial data under storage pressure.

## Description

Browsers are allowed to evict "best-effort" IndexedDB data (e.g. under low disk space) without warning the user. The `navigator.storage.persist()` API lets an app ask the browser to exempt its storage from that eviction. This ticket wires that request into app startup and surfaces the current status to the user.

## Current situation (as-is)

- No reference to `navigator.storage` exists anywhere in `src/` — the app never requests persistent storage today, so `appDb`'s IndexedDB data is subject to best-effort eviction like any other site's storage.
- `app.config.ts`'s `provideAppInitializer` already runs one async bootstrap sequence — opening `appDb`, hydrating every store, then dev-seeding — and is the natural place to add a persistence request alongside it, since it already runs once per app load before the UI renders.
- FR-DAT-4 in [finance-app-spec.md:112](../../v1.0_foundation/finance-app-spec.md) specs this; it was never ticketed or built.

## Desired result (to-be)

- On startup, after `appDb.open()` succeeds, the app calls `navigator.storage.persisted()` to check current status, and if not already persisted, calls `navigator.storage.persist()` once. Both calls are guarded by a feature check (`'storage' in navigator && 'persist' in navigator.storage`) since the API isn't universally available (notably Safari has partial/older support) — its absence must never block app startup or throw.
- The result (`granted` / `denied` / `unsupported`) is exposed as a readable signal (e.g. a small `StorageStatusService`/store) so a UI surface — most naturally the Data Management section from TICKET-DAT-01, or Settings if TICKET-SET-01 has landed — can show the user whether persistence is active, and if denied, a short explanation (most browsers grant it automatically for installed/bookmarked/frequently-visited sites, so a first visit may come back `denied` and later succeed after more engagement — this is browser heuristic, not something the app controls).
- The request never blocks or delays the rest of app bootstrap — it runs fire-and-forget alongside (not before) the store-hydration `Promise.all` in `app.config.ts`, since a denied/unsupported result must never prevent the app from loading and working normally with best-effort storage.

## Acceptance criteria

- [x] `navigator.storage.persisted()`/`.persist()` are called once on startup, guarded by a feature-detection check that no-ops safely (no thrown error, no blocked bootstrap) when the API is unavailable.
- [x] The granted/denied/unsupported result is exposed via a signal readable by UI, not just logged.
- [x] The persistence request runs alongside store hydration in `app.config.ts`, not blocking or gating it — app renders normally regardless of the outcome.
- [x] A visible status indicator (in the Data Management or Settings UI) shows whether persistent storage is currently granted, with a short explanation when it isn't.
- [x] Unit tests cover: the guarded call when `navigator.storage` is absent (no throw); the status signal reflecting `persisted() === true` without calling `persist()` again; the status signal reflecting a `persist()` call's resolved value when not yet persisted.
- [x] Verified via the fallow skill and coding-conventions skill.
- [x] Verified live in the browser: load the app, confirm no startup error/delay, and confirm the status indicator renders a value (granted or denied) — actually forcing a `denied`→`granted` transition isn't reliably triggerable from devtools, so this criterion only requires the indicator to render *some* real status, not both branches live. **Skipped at user's request this session** — automated checks (lint/test/build/fallow) all pass; live check can be done later.

## Notes

- This is a small, self-contained ticket with no schema change and no dependency on TICKET-DAT-01 or TICKET-DAT-03 — safe to build in any order relative to them.
- Re-checking `persisted()` on every app load (rather than only once ever) is intentional: the browser's decision can change between visits (e.g. denied on first visit, granted later once the site is "installed"/bookmarked), and the status indicator should reflect current reality, not a stale one-time result.
