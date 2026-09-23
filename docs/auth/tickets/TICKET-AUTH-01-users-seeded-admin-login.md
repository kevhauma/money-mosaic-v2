# TICKET-AUTH-01 — Users table, a seeded admin/admin account, and email + password login

- **Area:** Auth & Accounts
- **Released in:** _unreleased_
- **Type:** Feature
- **Traceability:** new — no FR covers accounts; extends the Persistence section of [`finance-app-spec.md`](../../reference/finance-app-spec.md); planned for v3

## User story

As the person hosting Money Mosaic for my household, I want to sign in with an email and a password against an account the server already knows about, so the app has an identity to attach data to instead of assuming one anonymous browser.

## Description

Adds the identity layer to the backend from [TICKET-SRV-01](../../server/tickets/TICKET-SRV-01-express-sqlite-drizzle-skeleton.md): a `users` table, a `sessions` table, a first-boot seed of an `admin` / `admin` account, and the three endpoints the client needs — log in, log out, who am I. **Server side only**; the login screen and the guard are [TICKET-AUTH-02](./TICKET-AUTH-02-login-screen-session-guard.md).

## Current situation (as-is)

- There is no concept of a user anywhere in the codebase. Nothing in [`src/app/`](../../../src/app/) reads or writes an identity, and every row in [`app-db.ts`](../../../src/app/core/data-access/app-db.ts) implicitly belongs to whoever opened the browser.
- [TICKET-SRV-01](../../server/tickets/TICKET-SRV-01-express-sqlite-drizzle-skeleton.md) leaves the Drizzle schema empty of tables — this ticket adds the first two.
- The app has no login route, no session state, and no HTTP interceptor; [`app.routes.ts`](../../../src/app/app.routes.ts) guards nothing.

## Desired result (to-be)

- **`users` table** (Drizzle, `server/src/schema/users.ts`): `id` (autoincrement PK), `email` (**unique**, stored lowercased and trimmed), `displayName`, `passwordHash`, `passwordSalt`, `role` (`'admin' | 'user'`), `disabled` (boolean, default false), `createdAt`, `passwordUpdatedAt`.
- **`sessions` table**: `token` (PK, 32 random bytes hex from `crypto.randomBytes`), `userId` (FK → `users.id`, `ON DELETE CASCADE`), `createdAt`. **No expiry column** — sessions live until logout or until the row is deleted (see non-goals).
- **First-boot seed**: when the `users` table is empty, insert one account with email **`admin`**, password **`admin`**, role `admin`, display name "Administrator". Seeding runs only on an empty table, so it can never resurrect a deleted admin or reset a changed password.
  - The identifier is literally `admin`, not `admin@local`: the login field is free text with **no email-format validation**, because this server is reached over a LAN by people who were told "admin/admin".
- **Passwords** are hashed with `scrypt` from **`node:crypto`** — no dependency — using a per-user 16-byte random salt, and compared with `timingSafeEqual`. The hash and salt never leave the server: no endpoint in this or any later ticket includes them in a response body.
- **Endpoints**:
  - `POST /api/auth/login` — `{ email, password }`. On success, creates a session row and sets it as an `httpOnly`, `sameSite=lax` cookie, returning the public user shape `{ id, email, displayName, role }`. On a wrong password, an unknown email, or a `disabled` account: **401 with one identical message** for all three, so the response does not enumerate accounts.
  - `POST /api/auth/logout` — deletes the session row and clears the cookie. Idempotent: logging out without a session is a 204, not an error.
  - `GET /api/auth/me` — returns the public user shape for the cookie's session, or **401** if there is no valid session.
- **`requireAuth` middleware** resolves the cookie to a user and puts it on the request, 401-ing otherwise. It is the single chokepoint every later `/api` route mounts behind — `/api/health` and the three auth routes above are the only exceptions.
- A **`PublicUser`** type is exported from the shared types module so the client and server describe the same shape.

## Acceptance criteria

- [ ] A first boot against an empty database creates exactly one user, `admin` / `admin`, with role `admin`.
- [ ] A second boot with users present seeds nothing, asserted by a test that changes the admin's password, restarts, and confirms the change survived.
- [ ] `POST /api/auth/login` with the seeded credentials returns 200, the public user shape, and a `Set-Cookie` with `HttpOnly`.
- [ ] Wrong password, unknown email, and a `disabled` user each return **401 with byte-identical bodies**, asserted by a test comparing all three responses.
- [ ] `GET /api/auth/me` returns the user for a valid cookie and 401 for a missing, malformed, or deleted-session cookie.
- [ ] `POST /api/auth/logout` deletes the session row, and reusing that cookie afterwards 401s.
- [ ] `passwordHash` and `passwordSalt` appear in **no** response body — asserted by a test that serialises every auth response and greps for the stored hash.
- [ ] The same password produces different hashes for two users (per-user salt), and verification uses `timingSafeEqual`.
- [ ] `requireAuth` rejects an unauthenticated request to a route mounted behind it, covered by a test against a throwaway protected route.
- [ ] Deleting a user cascades its session rows away.
- [ ] Backend tests cover every case above against an in-memory database.
- [ ] Verified via the fallow skill and coding-conventions skill.

## Notes

- **Deliberate non-goals, because this is local-only hosting.** Recorded here so a later reader knows they were decisions and not oversights: no HTTPS, no CSRF tokens, no login rate limiting or lockout, no session expiry or rotation, no password strength rules, no email verification, no password-reset-by-email flow (an admin resets it for you — [TICKET-AUTH-03](./TICKET-AUTH-03-admin-user-management.md)), no audit log. **Do not put this server on the public internet.** That sentence belongs in the README from [TICKET-SRV-09](../../server/tickets/TICKET-SRV-09-single-process-local-hosting.md).
- **Passwords are hashed anyway** even though the brief was "should not be secure": `scrypt` from the standard library is five lines and no dependency, and it means the SQLite file — which gets copied around as a backup — is not a plaintext password list for whatever people reused. This was confirmed with the user when the ticket was written.
- The identical-401-for-everything rule is not security theatre here so much as **simplicity**: one failure path, one message, one test.
- Keeping the identifier free-text rather than validated as an email is what makes the literal `admin` / `admin` seed work. If email-format validation is ever wanted, the seeded account has to change with it.
