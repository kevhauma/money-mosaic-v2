# TICKET-AUTH-04 — Change your own password, and stop the default admin password being forgotten

- **Area:** Auth & Accounts
- **Released in:** _unreleased_
- **Type:** Feature
- **Traceability:** new; planned for v3

## User story

As any signed-in user, I want to change my own password without asking the administrator, so an admin reset is the fallback rather than the only route.

## Description

Self-service password change in Settings, plus a standing reminder while the seeded `admin` account still has the password `admin` — the one credential every installation of this app shares.

## Current situation (as-is)

- [TICKET-AUTH-01](./TICKET-AUTH-01-users-seeded-admin-login.md) seeds `admin` / `admin` and [TICKET-AUTH-03](./TICKET-AUTH-03-admin-user-management.md) lets an **admin** set anyone's password, including their own. There is no way for a **non-admin** to change their own password, and nothing anywhere signals that the default password is still in place.
- The Settings page (`feature-settings`) is the established home for per-user preferences and already hosts embedded sections rather than sub-routes (see [TICKET-DAT-04](../../data-management/tickets/TICKET-DAT-04-commit-to-embed-set06-repair.md)).

## Desired result (to-be)

- **`POST /api/auth/password`** — `{ currentPassword, newPassword }` for the signed-in user. A wrong `currentPassword` returns **401**; an empty `newPassword` returns 400. On success it stamps `passwordUpdatedAt` and **keeps the caller's own session alive** while deleting that user's *other* sessions, so changing your password does not log you out of the tab you are typing in but does end the session on the machine you were worried about.
- **An "Account" section on the Settings page** showing the signed-in email, display name and role, with a change-password form (current, new, confirm). It reports success inline and clears all three fields.
- **Display name** is editable here too — the one field a non-admin can change about themselves.
- **Default-password reminder**: while the `admin` account's `passwordUpdatedAt` still equals its `createdAt` (i.e. the seeded password was never changed), the app shows a dismissible-per-session banner to **admins only**, linking to the Account section. `GET /api/auth/me` carries a `usingDefaultPassword` boolean so the client does not have to guess.
- **No forced change**: the banner nags, it does not block. This is a deliberately unsecured local-hosting setup, and someone who wants `admin`/`admin` on their own LAN keeps it.

## Acceptance criteria

- [ ] A signed-in non-admin can change their own password and sign in with the new one; the old one stops working.
- [ ] A wrong `currentPassword` returns 401 and changes nothing.
- [ ] Changing a password keeps the **calling** session valid and invalidates that user's **other** sessions — asserted by a test holding two cookies for the same user.
- [ ] `POST /api/auth/password` cannot be used to change anyone else's password — there is no id parameter, and the user is taken from the session.
- [ ] The new password and confirmation must match client-side before the request is sent; a mismatch never reaches the server.
- [ ] `GET /api/auth/me` reports `usingDefaultPassword: true` for the untouched seeded admin and `false` once it has been changed.
- [ ] The banner appears only for an admin whose password is still the seeded one, is dismissible for the session, and disappears permanently once the password changes.
- [ ] Display name changes are reflected in the shell's user area without a reload.
- [ ] Unit tests cover the form's validation and success/failure paths, the banner's visibility rules, and the backend cases above.
- [ ] Verified via the fallow skill and coding-conventions skill.
- [ ] Verified live in the browser: sign in as `admin`, see the banner, change the password from Settings, confirm the banner is gone and the session survived, then sign out and back in with the new password.

## Notes

- **The banner is the whole reason this ticket is not just "a form".** Every installation of this app ships with the same known credentials; a quiet, persistent, admin-only reminder is the cheapest honest answer that does not contradict the deliberately-unsecured brief. See the non-goals list in [TICKET-AUTH-01](./TICKET-AUTH-01-users-seeded-admin-login.md).
- Keeping the calling session alive while killing the others is the behaviour people expect from "I think someone else is logged in as me" — the only realistic reason to change a password on a LAN box.
- Depends on [TICKET-AUTH-02](./TICKET-AUTH-02-login-screen-session-guard.md) for the session store and [TICKET-AUTH-01](./TICKET-AUTH-01-users-seeded-admin-login.md) for hashing. Independent of the SRV data-migration tickets — it can ship as soon as the login screen exists.
