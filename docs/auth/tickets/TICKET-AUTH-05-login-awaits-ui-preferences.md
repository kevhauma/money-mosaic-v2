# TICKET-AUTH-05 — Sign-in waits for the account's UI preferences

- **Area:** Auth & Accounts
- **Released in:** _unreleased_
- **Type:** Bug fix
- **Traceability:** follows [TICKET-SRV-10](../../server/tickets/TICKET-SRV-10-ui-preferences-off-localstorage.md) (per-account UI preferences), which affects TICKET-SET-05 (theme), TICKET-PUB-01 (landing page) and TICKET-PUB-04 (backup reminder); CR6-25 ([code review](../../releases/v3_code_review_2/code-review.md))

## User story

As someone signing in, I want the app to open in my own theme and on the page I'd expect, so I don't see the default look, the welcome page or a reminder I already dismissed every time I log in.

## Description

Sign-in starts reloading the account's data but doesn't wait for it. The login page navigates straight away, while the theme, the "has visited" flag and the backup-reminder flag still hold their defaults.

## Current situation (as-is)

- `SessionStore.login` in [`session.store.ts`](../../../src/app/core/auth/session.store.ts) resets every store, then calls `void storeReset.rehydrateAll()` (line 200) and returns `true` without waiting.
- [`login-page.component.ts`](../../../src/app/feature-auth/components/login-page/login-page.component.ts) calls `navigateByUrl(returnUrl ?? '/dashboard')` as soon as `login` resolves (line 83).
- `UiPreferencesService` is one of the registrations `rehydrateAll` fires ([`ui-preferences.service.ts`](../../../src/app/core/ui-preferences/ui-preferences.service.ts)). After the reset, and until its `restore()` (lines 79–89) lands, it answers `DEFAULT_UI_PREFERENCES`. This happens both on a sign-in over another session in the same tab and on a fresh page load, where the app initializer found no session to load preferences for. The effects:
  - The default theme renders until the read lands.
  - `markVisitedGuard` → `VisitedService.markVisited` ([`visited.service.ts`](../../../src/app/core/onboarding/visited.service.ts)) sees `hasVisited` false and writes it again on every login. The service's doc comment assumes the app initializer has already loaded it, which isn't true after a sign-in.
  - With `returnUrl=/`, [`home-redirect.guard.ts`](../../../src/app/core/onboarding/home-redirect.guard.ts) reads `hasVisited` false and shows a returning user the landing page.
  - The backup reminder can flash before `backupReminderDismissed` arrives.

## Desired result (to-be)

- The login page navigates only after the signed-in account's UI preferences have loaded. If the read fails it still navigates, because `UiPreferencesService` never rejects.
- The other stores keep hydrating in the background. Sign-in doesn't wait for transactions and the rest.
- One `GET` of the preferences per sign-in, not two.

## Acceptance criteria

- [ ] After a successful `login`, the login page doesn't call `navigateByUrl` until the preferences read has settled. (`login-page.component.spec.ts` → new case "navigates only once the account's UI preferences have loaded".)
- [ ] A failed preferences read still navigates. (Same spec, second case.)
- [ ] Signing in as an account with `hasVisited: true` and `returnUrl=/` lands on `/dashboard`, and sends no `hasVisited` write. (Spec on the guard path or `session.store.spec.ts`.)
- [ ] The preferences endpoint is called once per sign-in. (Asserted in the same spec through the fake repository.)
- [ ] Persistence stays behind `UiPreferencesRepository`; no direct API calls from the store or the page.
- [ ] `ng lint`, `ng test` and `ng build --configuration development` pass, and the bundle budget is unchanged.
- [ ] Verified via the fallow skill and coding-conventions skill.
- [ ] Verified live in the browser: sign in as an account with a non-default theme, a dismissed reminder and `hasVisited` set, from `/login?returnUrl=/`. No default-theme flash, no landing page, no reminder, and no preferences write in the network log.

## Notes

- `SessionStore` can't inject `UiPreferencesService`, because the service already injects `SessionStore`. The wait belongs in the login page, or in a way to rehydrate one named registration through `StoreResetService`.
- Calling `restore()` from the page while `rehydrateAll` also calls it would send two requests. Whichever side waits has to share the one read.
- `login-page` is on the eager path. `UiPreferencesService` is already eager (the app initializer builds it), so importing it there costs nothing in bundle size.
