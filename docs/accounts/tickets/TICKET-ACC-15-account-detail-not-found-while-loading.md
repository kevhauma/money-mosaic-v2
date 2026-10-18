# TICKET-ACC-15 — Account detail says "Account not found" only when it truly is

- **Area:** Accounts
- **Released in:** _unreleased_
- **Type:** Bug fix
- **Traceability:** extends TICKET-SRV-06 (hydration over a network that can fail) to `/accounts/:id`; found while working [TICKET-SRV-13](../../server/tickets/TICKET-SRV-13-port-account-detail-dashboard-to-v3.md)

## User story

As someone running the self-hosted v3 server, I want an account's page to say it is loading, or that the server could not be reached, instead of telling me the account does not exist, so that a slow or stopped server never makes me think my account was deleted.

## Description

On `feature/v3-server-accounts` accounts arrive over the network. Until they do, and whenever loading them fails, `/accounts/:id` tells the user the account "may have been deleted or archived away". This ticket gates the page on `AccountsStore`'s loading and error state the way TICKET-SRV-06 gated the Dashboard. "Account not found" is then shown only once accounts have loaded and none has this id.

## Current situation (as-is)

- [accounts-detail.component.html](../../../src/app/feature-accounts/components/accounts-detail/accounts-detail.component.html) opens with `@if (account(); as account)`, and its `@else` renders `mm-empty-state` "Account not found — It may have been deleted or archived away.".
- **Root cause:** [accounts-detail.component.ts](../../../src/app/feature-accounts/components/accounts-detail/accounts-detail.component.ts)'s `account` computed reads `accountsStore.accounts().find(...)`, and nothing else in the page reads `AccountsStore`'s `hydrated`, `loading` or `error`. So `null` means three different things:
  - **not loaded yet:** a cold load of `/accounts/1` before the `GET /api/accounts` answers;
  - **failed to load:** the read failed (server stopped, network down), so `accounts()` stays empty;
  - **genuinely absent:** the id matches no account.

  All three render the same sentence.
- [accounts.routes.ts](../../../src/app/feature-accounts/accounts.routes.ts) already notes that `AccountsStore` "may not have hydrated yet on a cold load of this URL" (the reason the tab title is the generic `'Account'`), but the page itself never acts on it.
- Since TICKET-SRV-13 the page's *insight section* sits behind its own `mm-hydration-boundary` (`account-insights`). The page around it does not, so the false empty state is the one in the host.
- The exemplars to copy: the Dashboard, transactions and income overviews gate on [`hydrationOf(...)`](../../../src/app/shared/utils/hydration-status.ts) through [`<mm-hydration-boundary>`](../../../src/app/shared/ui/hydration-boundary/hydration-boundary.component.ts). The coding-conventions rule "A page renders its stores' loading and error states, never their emptiness" calls a page without one "a gap to close".

## Desired result (to-be)

- While `AccountsStore` is loading, `/accounts/:id` shows the boundary's skeleton: no "Account not found", and no header naming an account it hasn't read yet.
- When `AccountsStore` fails to load, the page shows the boundary's error ("Cannot reach the server. Is it running?" for an outage) with **Try again**. Try again re-reads, and on success the account's page appears with no reload.
- Once `AccountsStore` has loaded, an id that matches no account still shows "Account not found" with its **Back to accounts** action, exactly as today.
- Everything inside the found-account branch is unchanged, including the insight section's own boundary (TICKET-SRV-13).

## Acceptance criteria

- [x] `accounts-detail` wraps its content in `<mm-hydration-boundary>` fed by `hydrationOf(AccountsStore)` (`@/shared/utils`, `@/shared/ui`), so the not-found branch can only render once `AccountsStore` has loaded without error. (`accounts-detail.component.html` opens with the boundary; `accounts-detail.component.ts` adds `hydration = hydrationOf(this.accountsStore)`, and `accountsReady` = `hydrated && !loading && error === null` gates the `@else if (account())` / `@else` "Account not found" branches.)
- [x] While `AccountsStore` is loading, the page shows the boundary skeleton and neither "Account not found" nor an account header. (Spec "shows a skeleton, not "Account not found", while accounts are still loading". Live: `GET /api/accounts` delayed 5 s, then signed out and back in and opened `/accounts/1`. A MutationObserver saw the boundary skeleton and never saw "Account not found"; the header appeared at about 4.2 s.)
- [x] With `AccountsStore`'s read failing, the page shows the boundary error with Try again and no "Account not found". Try again recovers the found-account page without a reload. (Spec "reports a failed read with Try again instead of "Account not found", and Try again recovers the page": every read fails until just before the click, and it asserts the click itself starts the re-read, so it fails if `(retry)` is unbound; verified by unbinding it. Live: with `GET /api/accounts` failing, `/accounts/1` showed only "Cannot reach the server. Is it running?" + Try again, with no header. After restoring the read, Try again showed "Everyday Checking", four figures and three charts sized 961/469/469 px, with no reload.)
- [x] With accounts loaded and no account matching the id, "Account not found" and its Back to accounts link render as before. (Spec "still says "Account not found" once accounts have loaded and none has this id", whose link points to `/accounts`. Live: `/accounts/999` shows "Account not found" inside the boundary.)
- [x] Nothing under the boundary mounts detached: either the found-account branch is only built once the boundary shows its content, or it is shown that nothing in it needs this, because `account()` is `null` whenever the boundary hides its content. The detached-chart gotcha is in coding-conventions (TICKET-SRV-13). (The first option: `accountsReady` is false whenever the boundary hides its content, so the found-account branch, `app-account-insights` included, is never built hidden. Live, the charts measured 961/469/469 px after recovery. A dev-seed `hydrate({ force: true })` therefore tears the branch down and rebuilds it, which closes any open dialog; only the dev seed does that.)
- [x] Reads stay in `AccountsStore` (`core/state`); no component calls `ApiClient` / `HttpClient`, and nothing writes to browser storage. (Grepping `accounts-detail.component.*` for `localStorage|sessionStorage|indexedDB|appDb|ApiClient|HttpClient` finds nothing.)
- [x] Unit tests in `accounts-detail.component.spec.ts` cover: the loading skeleton (no not-found text); the failed read showing the error and Try again, then recovering; and a loaded store with an unknown id still showing "Account not found". (Describe "AccountsDetailComponent against a server that is slow or down (TICKET-ACC-15)" has 3 tests. Against the unfixed component the loading and failure tests fail; the not-found test is the as-before regression guard and passes both ways.)
- [x] `ng lint`, `ng test`, `ng build --configuration development` and both fallow CI gates pass. (Final tree: lint exit 0; 345 files / 3876 tests passed; dev build exit 0; `fallow dead-code --baseline` and `fallow health --complexity` both exit 0.)
- [x] Verified live in the browser against the API server: a cold load of `/accounts/1` never shows "Account not found"; with `GET /api/accounts` failing the page shows the error and recovers on Try again; `/accounts/999` shows "Account not found". (`api` (4300) + `dev` (4210) launch configs. The loading window was produced by delaying the read and reloading through sign-out/sign-in in the same tab, so the fault survived; observed rather than screenshotted. Evidence is in the three criteria above.)
- [x] Verified via the fallow skill and coding-conventions skill. (Both fallow gates exit 0. `conventions-reviewer` found the component change clean, with gating that matches the `contentShown` exemplar. It traced every state and found no false not-found and no stuck skeleton. Its spec findings were applied: the shared mock is reset per test, and the retry test proves the click and no longer relies on a rejected-once ordering. The same vacuous-retry flaw was fixed in TICKET-SRV-13's `account-insights` spec.)

## Notes

- **No Roadmap or Changelog entry**, decided with the user on 2026-10-18. The bug exists only on the unmerged v3 branch, because the browser-only app on `main` cannot fail to read its accounts, so nobody on a released build has met it. This follows the Server area's rule for v3 plumbing. Don't add them back as an oversight.
- **Only `AccountsStore` gates the page.** `ImportBatchesStore`'s failure already reads as "no last-import line" (`lastImport` returns `null` until it hydrates), which claims nothing false. The balance block waits on `AccountsStore.dataReady` (transactions + transfers) and shows a skeleton, never a figure, while those load or fail. The insight section below it reports that failure in words.
- **Header during loading and failure:** the boundary replaces the whole page, header included, because the header's title is the account's name. During loading and failure the page therefore has no Back to accounts button, and the sidebar's Accounts entry is the way back. A boundary scoped below a generic header would be the alternative if that proves awkward live.
- Only the dev seed and Try again ever call `AccountsStore.hydrate({ force: true })`, so a page-level boundary will not flash back to a skeleton during normal use.
- Bug introduced on the v3 branch by TICKET-SRV-05/SRV-06 (accounts over HTTP) and left out of SRV-06's three converted pages.
