# TICKET-AUTH-03 — Admin panel: create, rename, reset, disable and delete the other accounts

- **Area:** Auth & Accounts
- **Released in:** _unreleased_
- **Type:** Feature
- **Traceability:** new; planned for v3

## User story

As the administrator of our household's Money Mosaic, I want a page where I can create accounts for the others and reset a password when someone forgets theirs, so nobody has to touch the database file to get back in.

## Description

The management surface the seeded `admin` account exists for: an admin-only page listing every account, with create, rename, reset-password, promote/demote, disable and delete. Every action is enforced **on the server** by role, not merely hidden in the UI.

## Current situation (as-is)

- [TICKET-AUTH-01](./TICKET-AUTH-01-users-seeded-admin-login.md) creates the `users` table and the `role` column, and seeds one `admin`. Nothing reads `role` yet and there is no way to create a second account — the seeded admin is the only way in.
- There is no admin area in the app; [`app.routes.ts`](../../../src/app/app.routes.ts) has no role-aware route.
- Password hashing (`scrypt` + per-user salt) already exists from AUTH-01 and is reused here rather than reimplemented.

## Desired result (to-be)

- **`requireAdmin` middleware**, layered on AUTH-01's `requireAuth`, returning **403** for a signed-in non-admin. Every endpoint below mounts behind it.
- **Endpoints** under `/api/admin/users`:
  - `GET /` — every user as `{ id, email, displayName, role, disabled, createdAt, passwordUpdatedAt }`. Never a hash.
  - `POST /` — create `{ email, displayName, password, role }`. A duplicate email returns **409** with a clear message. Creating a user also runs the per-user default seed from [TICKET-SRV-02](../../server/tickets/TICKET-SRV-02-drizzle-schema-per-user.md) (default categories, bank mapping profiles, transfer settings), so a new account opens a working app rather than an empty one.
  - `PATCH /:id` — change `displayName`, `role`, or `disabled`.
  - `POST /:id/password` — set a new password directly; **no current password required**, that is the point of an admin reset. Stamps `passwordUpdatedAt` and **deletes every session row for that user**, so an in-progress session cannot outlive the reset.
  - `DELETE /:id` — deletes the user **and every row they own** in one transaction.
- **Server-enforced invariants**, each returning 409 with its own message:
  - the **last remaining admin** cannot be demoted, disabled, or deleted;
  - an admin cannot **delete or disable themselves** (demoting yourself is allowed as long as another admin remains);
  - `email` is unique, compared lowercased and trimmed.
- **`/admin/users` page** in `feature-auth`, behind an `adminGuard` that redirects a non-admin away rather than rendering a page they will only get 403s from. The route entry is visible in the shell nav **only** for an admin.
  - A table of accounts with their role, status and last password change.
  - Create-account dialog; inline rename; a role toggle; a disable toggle.
  - Reset-password dialog that shows the new password back to the admin once, in plain text, so it can be read out to the person it belongs to.
  - Delete confirmation that **names what will be destroyed** — the account and its transactions, accounts, categories and everything else — and requires typing the account's email to proceed, matching the existing delete-all-data pattern in `feature-data-management`.
- **Disabled means locked out, not deleted**: AUTH-01's login already refuses a `disabled` user with the same 401 as a wrong password, and this ticket additionally deletes their sessions at the moment they are disabled.

## Acceptance criteria

- [x] A signed-in **non-admin** receives 403 from every `/api/admin/users` endpoint, tested per endpoint — not just hidden in the UI. (`requireAdmin` in [`server/src/middleware/require-admin.ts`](../../../server/src/middleware/require-admin.ts), mounted once on the router so an endpoint added later is administrator-only by existing; `admin-users.spec.ts` > "answers 403 on every endpoint for a signed-in non-admin" sweeps all five — GET /, POST /, PATCH /:id, POST /:id/password, DELETE /:id — each with an otherwise-valid body, so the refusal is the middleware's and not a 400 standing in for it.)
- [x] An unauthenticated request to the same endpoints receives 401. (`admin-users.spec.ts` > "answers 401 on every endpoint without a session" — the same five-endpoint sweep with no cookie. The router is an entry in `routes/api.ts`, so `api.spec.ts`'s per-router 401 check covers it a second way without anyone remembering to add it there.)
- [x] Creating a user seeds their default categories, mapping profiles and transfer settings; the new account can sign in and lands on a working, empty-but-seeded app. (`createUser` in `server/src/auth/users.ts` inserts the row and calls `seedUserDefaults` in **one** transaction, exactly as `seedAdminUser` does on first boot. `admin-users.spec.ts` > "creates an account that can sign in and opens a seeded, empty app" signs in as the new account over HTTP and asserts `GET /api/categories` = `DEFAULT_CATEGORIES.length`, `GET /api/mappingProfiles` = `DEFAULT_MAPPING_PROFILE_TEMPLATES.length`, a real `transferSettings` row, and `GET /api/transactions` = `[]`.)
- [x] A duplicate email (differing only in case or surrounding whitespace) returns 409 and creates nothing. (The check goes through `findUserByEmail`, which normalises, so ` ADA` collides with `ada`; `admin-users.spec.ts` > "refuses a duplicate email differing only in case or whitespace, and creates nothing" asserts the 409, its wording, and an unchanged row count. The unique index is still the guarantee — the pre-check is what makes the answer a 409 rather than the 500 a constraint failure becomes.)
- [x] Resetting a password lets the user sign in with the new one, refuses the old one, and **invalidates every existing session for that user** — asserted by a test that holds a cookie across the reset. (`POST /:id/password` writes the digest and `deleteUserSessions` in one transaction; `admin-users.spec.ts` > "sets a new password without the old one, refuses the old one, and ends every session" signs in as the user first, and after the reset that held cookie answers 401 on `/api/auth/me`, the `sessions` rows are gone, the old password is refused and the new one works. A sibling test pins that `passwordUpdatedAt` moves and `createdAt` does not.)
- [x] Disabling a user invalidates their sessions immediately and blocks a fresh sign-in. (`admin-users.spec.ts` > "disabling ends the sessions the user is already signed in on, and blocks a fresh sign-in" — the held cookie works before the PATCH and 401s after it, the `sessions` rows are deleted, and a fresh login answers 401. "re-enabling an account lets it sign in again" pins that the lock-out is not one-way.)
- [x] The last admin cannot be demoted, disabled, or deleted — three tests, three distinct 409 messages. (`assertAdminRemains` in `routes/admin-users.ts`, counting _enabled_ administrators via `enabledAdminCount`; `admin-users.spec.ts` > "api: the last administrator" is an `it.each` of the three attempts asserting each message verbatim and that the row is untouched, plus "may be demoted, disabled or deleted once another administrator exists" (demoting yourself stays allowed while another remains) and "ignores a disabled administrator when counting who can still administer".)
- [x] An admin cannot delete or disable their own account. (`assertNotSelf`; `admin-users.spec.ts` > "cannot disable or delete themselves, even with another administrator present" asserts both 409s and an untouched row, while "may still rename themselves from the panel" pins that the rule covers only the two irreversible actions.)
- [x] Deleting a user removes their sessions **and every data row they own**, in one transaction, verified by a test that counts rows in every user-owned table before and after. (`deleteUserWithData` runs `PRAGMA defer_foreign_keys`, `clearUserRows` and the `users` delete in one transaction — `sessions` goes with its own cascade. The table list is derived from the Drizzle schema in the new [`server/src/operations/user-rows.ts`](../../../server/src/operations/user-rows.ts), which `DELETE /api/data` now shares, so a table added later is covered without editing either endpoint. `admin-users.spec.ts` > "removes the account, its sessions and every row it owns, leaving everyone else intact" fills **all eighteen** per-user tables first and asserts none is empty, then that every count is 0 afterwards, the user and session rows are gone, and a bystander's counts are unchanged.)
- [x] The nav entry and the `/admin/users` route are unreachable for a non-admin; `adminGuard` redirects rather than rendering. ([`core/auth/admin.guard.ts`](../../../src/app/core/auth/admin.guard.ts) returns a `UrlTree` to `/dashboard` for a signed-in non-admin and to `/login?returnUrl=…` for a signed-out one, awaiting `restore()` on an `unknown` session first; `admin.guard.spec.ts` covers all four cases. The nav entry renders under `@if (sessionStore.isAdmin())` — `app-shell.component.spec.ts` > "offers the user-accounts link to an admin and to nobody else" signs one in, then the other, against the same fixture.)
- [x] Unit tests cover the component's create/reset/delete flows and the guard; backend tests cover every rule above. (Client — `admin-users-page.component.spec.ts` (12: create through the dialog, the duplicate-email refusal, reset showing the password back, delete gated on typing the email, a refused delete, inline rename, promote/disable, the load-failure retry, the table's labels and the self-row's blocked controls), `admin-create-account-dialog.component.spec.ts` (5), `admin-reset-password-dialog.component.spec.ts` (5), `admin-user-actions.component.spec.ts` (4), `admin-users.store.spec.ts` (5) and `admin.guard.spec.ts` (4). Backend — `admin-users.spec.ts`, 24 tests. Full runs: `ng test` 3712 passed, `npm run test:server` 402 passed.)
- [x] Verified via the fallow skill and coding-conventions skill. (`npx fallow dead-code --baseline .fallow-baseline.json --fail-on-issues --quiet` and `npx fallow health --complexity --max-cognitive 30 --max-cyclomatic 30 --max-crap 1000 --fail-on-issues --quiet` — the gate `.husky/pre-commit` actually runs — both exited 0 with no output. The diff was reviewed against `.claude/skills/coding-conventions/SKILL.md` **by hand**: the `conventions-reviewer` subagent could not be spawned in this run. Two things came out of it — the page template was split at 142 lines into `admin-user-actions/`, on TICKET-AUTH-04's precedent, and the skill gains the two conventions this ticket established (the nested `loadComponent` for a feature's second route table, and the role check inside a role-restricted store's `hydrate`).)
- [ ] Verified live in the browser: as `admin`, create a second account, sign in as it in another browser profile, confirm it sees its own empty-but-seeded data, then reset its password from the admin panel and confirm the old password stops working. — not ticked: browser verification waived by the user for the v3 server/auth run. The server half of this scenario is covered end-to-end by `admin-users.spec.ts` against a real HTTP server on an ephemeral port; what is unverified is the screen.

## Notes

- **Showing the reset password in plain text is deliberate.** There is no email delivery on a LAN-hosted box, so the admin has to be able to read the new password out loud. It is displayed once, in the dialog, and never stored anywhere readable.
- **Deleting a user deletes their finances.** This is the single most destructive action in the app, which is why it asks for the email to be typed rather than a plain confirm — the same standard [TICKET-DAT-03](../../data-management/tickets/TICKET-DAT-03-delete-all-data.md) set for delete-all-data.
- Depends on [TICKET-AUTH-01](./TICKET-AUTH-01-users-seeded-admin-login.md) (users, roles, hashing) and [TICKET-SRV-02](../../server/tickets/TICKET-SRV-02-drizzle-schema-per-user.md) (the per-user tables the delete cascades through, and the per-user seed). Build it after both; the UI half also wants [TICKET-AUTH-02](./TICKET-AUTH-02-login-screen-session-guard.md)'s session store.
- Not in scope: self-service registration, invite links, per-user quotas, or sharing one dataset between two accounts. Shared finances are modelled today by the **joint account** features (`ownershipShare`, `coOwners`), which are per-dataset and unaffected by this ticket.

## Implementation notes (2026-09-29)

Decisions taken while building, each of them a narrowing rather than an addition:

- **An email is chosen once, at creation, and is never editable.** `PATCH /:id` takes `displayName`,
  `role` and `disabled` and nothing else, so "inline rename" in the to-be section means the _display
  name_. This is the deliberate answer to the warning in
  [`server/src/auth/session-user.ts`](../../../server/src/auth/session-user.ts): `usingDefaultPassword`
  identifies the shipped account by its `admin` identifier, and that comment expected this ticket to
  break it. Nothing here can move an account's identifier, so the check still holds, and the doc
  comment has been rewritten to record that rather than to warn about it. Deleting the seeded admin
  _is_ possible — but only while another administrator who can sign in remains, and a deleted account
  is not a shared credential left in place, so the reminder correctly stops applying. A `seeded`
  column remains the fix if an email ever becomes editable.
- **The last-administrator rules are checked before the not-yourself rules**, which is what makes all
  five messages reachable: only an enabled admin can call this router, so the last enabled admin is
  always the caller. Told "you cannot delete your own account", a sole admin would reasonably think
  asking somebody else to do it would work.
- **"Last administrator" counts administrators who are _not disabled_**. An installation whose only
  enabled admin has just been demoted, disabled or deleted cannot be administered, and a disabled
  admin is no more use for that than none.
- **The refusals carry no `clientCode`.** TICKET-AUTH-04 added that field for a failure a client must
  _branch_ on; every 409 here is one the panel _displays_, next to the control that earned it.
- **An admin who resets their own password from the panel is signed out**, because "every session of
  that user" cannot have an exception without becoming "every session except possibly one". The
  self-service route in Settings (TICKET-AUTH-04) is the one that keeps the caller signed in.
- **`PER_USER_TABLES` / `clearUserRows` moved out of `routes/data.ts`** into
  `server/src/operations/user-rows.ts`, unchanged, so the delete-user endpoint and `DELETE /api/data`
  answer "every row this user owns" from one derived list instead of one route module importing
  another's internals.
- **No Roadmap or Changelog entry**, per this area's standing decision in
  [docs/auth/overview.md](../overview.md) — `work-ticket`'s Step 6.5 is skipped for every AUTH ticket.
- The page's own template was split at 142 lines: each row's five controls are
  `components/admin-user-actions/`, on the precedent TICKET-AUTH-04 set when the Settings account
  section hit 139.

### Review notes (2026-09-29)

Changed after the `conventions-reviewer` pass, before the commit. The reviewer found no cascade or
authorisation defect — the 18-table delete, the `requireAuth`+`requireAdmin` layering and the
last-admin ordering all held — but three things needed fixing:

- **`POST /:id/password` now refuses to target the caller.** It was the one route with no self-guard,
  and the panel offered the button on your own row. Aimed at yourself, a reset that deliberately asks
  for _no_ current password means a live session is enough to replace that account's password — which
  is exactly what TICKET-AUTH-04 exists to prevent, and it would also have silently signed the admin
  out mid-dialog (`deleteUserSessions` kills every session of the target, the caller's included).
  Self-service lives in Settings, where the current password is checked; the refusal says so. Mirrored
  client-side as `canResetPassword` on the row, and pinned by a server case asserting the row is
  byte-for-byte unchanged.
- **Demoting your own account now re-reads the session and leaves the panel.** It is allowed while
  another administrator remains, but `SessionStore.restore()` is memoised, so the client went on
  believing it was an admin: the nav entry stayed, `adminGuard` kept admitting the URL, and every
  further action answered 403 with nothing on screen explaining why. `SessionStore` gained a
  non-memoised `refresh()` for the case, and the page navigates to `/dashboard` after a successful
  self-demotion. A failed one stays put.
- **The reset reads its row back instead of synthesizing the response.** The row was read _before_ the
  deliberately-slow hash, so a delete landing in that window made both writes no-ops while the endpoint
  still answered 200 — telling an admin it had changed the password of an account that no longer
  existed. `updateUserPassword` now answers the updated row, and `undefined` becomes a 404.
- Documentation: the `AdminUser` block had been inserted between `SessionUser`'s doc comment and
  `SessionUser` itself, leaving one type with two comments (the first describing the other type) and
  the other with none; and `blockedReason` was documented as a button `title` while being rendered as
  a caption (`mm-button` exposes no `title` input, so the caption is the right call — the comment was
  wrong, not the code).

Left as they are, deliberately: the last-admin check is check-then-write rather than transactional,
which is safe because both handlers are fully synchronous and Node is single-threaded — the reasoning
is already written down at the call site.
