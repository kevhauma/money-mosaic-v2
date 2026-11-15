# TICKET-NG-14 — Store hydration ignores loads a reset or newer load superseded

- **Area:** State lifecycle (core/store-reset)
- **Released in:** _unreleased_
- **Type:** Bug fix
- **Traceability:** CR5-7; completes the sign-out wipe of TICKET-AUTH-02 and the hydration lifecycle of TICKET-SRV-06; NFR-PRIV-1 (one user's data must not reach another account)

## User story

As a user signing in on a browser someone else just signed out of, I want none of their data to land in my stores or my account, so a slow request they started can never show me their transactions or save their model under my name.

## Description

`reset` clears each store and forgets its memoised hydration, but nothing stops a load already running from patching the store afterwards. A slow `getAll()` started by user A can land after sign-out and fill user B's stores. `UiPreferencesService` already guards this with a generation counter; `createHydration` doesn't.

## Current situation (as-is)

- [with-hydration.ts:89-140](../../../src/app/core/store-reset/with-hydration.ts) — `createHydration`: `reset` sets `hydration = null` (lines 107-110); `hydrate` runs `load()`, which patches the store itself, then `patchHydration({ loading: false, … })`. No check that the store wasn't reset, or a newer `hydrate({ force: true })` started, in between.
- Line 122: a failed load sets `hydration = null` unconditionally, so a stale failure can clear a newer attempt's memoised promise and trigger a third load.
- [ui-preferences.service.ts:122-126](../../../src/app/core/ui-preferences/ui-preferences.service.ts) — `reset()` bumps `this.generation`, the guard this ticket copies.
- Sign-out flow: [session.store.ts:181](../../../src/app/core/auth/session.store.ts) `storeReset.resetAll()`, then [:200](../../../src/app/core/auth/session.store.ts) `void storeReset.rehydrateAll()` for the next user.
- Worst trigger (a store action, not a load): [category-model.store.ts:195-250](../../../src/app/feature-categories/category-model.store.ts) — `train()` runs for minutes, then `repository.save(artifact)` (line 244). If A signs out and B signs in meanwhile, the PUT carries B's cookie and stores A's model in B's account.

## Desired result (to-be)

- `createHydration` keeps a generation counter, bumped by `reset` and by every forced `hydrate`. A load whose generation is no longer current applies none of its patches — not the store's data, not `loading`/`error` — and doesn't clear the memoised promise.
- `load` can't patch past the guard: either it returns the patch for `createHydration` to apply, or it receives an `isCurrent()` check it must call before each patch. Choose one and apply it to all 18 `createHydration` callers.
- `createHydration` exposes the generation (or an `isCurrent` for a captured token) so long-running actions can check it; `train()` drops its result and skips `save` when the store was reset while it ran.

## Acceptance criteria

- [ ] Load starts, `reset()` is called, then the load resolves with rows: the store stays empty and `loading` stays as reset left it.
- [ ] Load A starts, `hydrate({ force: true })` starts load B; A resolves after B: the store holds B's data.
- [ ] Load A fails after load B started: B's memoised promise is kept (no third load) and `error` stays `null`.
- [ ] `train()` in flight, store reset, training finishes: `repository.save` is not called and the store stays reset.
- [ ] Every `createHydration` caller is converted; `hydrating-stores.spec.ts` / `store-reset-registry.spec.ts` still pass.
- [ ] `with-hydration.spec.ts` covers the first three cases; `category-model.store.spec.ts` the fourth.
- [ ] `ng lint`, `ng test`, `ng build --configuration development` pass.
- [ ] Verified via the fallow skill and coding-conventions skill.

## Notes

- CR5-7's alternative — a full page load on sign-out (`location.assign('/login')`) — kills every request and the worker at once and needs no guard. It was not chosen for this backlog (the ticket title fixes the generation approach), but if converting the 18 loads turns out invasive, raise it before building.
- Other long-running actions beyond `train()` were not audited; grep for `await` followed by a repository write in store actions while building this.
- No UI change, so no browser check; the specs carry it.
