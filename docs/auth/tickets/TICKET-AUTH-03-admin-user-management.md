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

- [ ] A signed-in **non-admin** receives 403 from every `/api/admin/users` endpoint, tested per endpoint — not just hidden in the UI.
- [ ] An unauthenticated request to the same endpoints receives 401.
- [ ] Creating a user seeds their default categories, mapping profiles and transfer settings; the new account can sign in and lands on a working, empty-but-seeded app.
- [ ] A duplicate email (differing only in case or surrounding whitespace) returns 409 and creates nothing.
- [ ] Resetting a password lets the user sign in with the new one, refuses the old one, and **invalidates every existing session for that user** — asserted by a test that holds a cookie across the reset.
- [ ] Disabling a user invalidates their sessions immediately and blocks a fresh sign-in.
- [ ] The last admin cannot be demoted, disabled, or deleted — three tests, three distinct 409 messages.
- [ ] An admin cannot delete or disable their own account.
- [ ] Deleting a user removes their sessions **and every data row they own**, in one transaction, verified by a test that counts rows in every user-owned table before and after.
- [ ] The nav entry and the `/admin/users` route are unreachable for a non-admin; `adminGuard` redirects rather than rendering.
- [ ] Unit tests cover the component's create/reset/delete flows and the guard; backend tests cover every rule above.
- [ ] Verified via the fallow skill and coding-conventions skill.
- [ ] Verified live in the browser: as `admin`, create a second account, sign in as it in another browser profile, confirm it sees its own empty-but-seeded data, then reset its password from the admin panel and confirm the old password stops working.

## Notes

- **Showing the reset password in plain text is deliberate.** There is no email delivery on a LAN-hosted box, so the admin has to be able to read the new password out loud. It is displayed once, in the dialog, and never stored anywhere readable.
- **Deleting a user deletes their finances.** This is the single most destructive action in the app, which is why it asks for the email to be typed rather than a plain confirm — the same standard [TICKET-DAT-03](../../data-management/tickets/TICKET-DAT-03-delete-all-data.md) set for delete-all-data.
- Depends on [TICKET-AUTH-01](./TICKET-AUTH-01-users-seeded-admin-login.md) (users, roles, hashing) and [TICKET-SRV-02](../../server/tickets/TICKET-SRV-02-drizzle-schema-per-user.md) (the per-user tables the delete cascades through, and the per-user seed). Build it after both; the UI half also wants [TICKET-AUTH-02](./TICKET-AUTH-02-login-screen-session-guard.md)'s session store.
- Not in scope: self-service registration, invite links, per-user quotas, or sharing one dataset between two accounts. Shared finances are modelled today by the **joint account** features (`ownershipShare`, `coOwners`), which are per-dataset and unaffected by this ticket.
