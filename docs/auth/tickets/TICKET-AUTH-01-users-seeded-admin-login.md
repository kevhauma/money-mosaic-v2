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

## Implementation notes (2026-09-23)

Decisions taken while building, where the code says a little more than the to-be above:

- **Hashing: `scrypt` + `timingSafeEqual` from `node:crypto`**, 16-byte per-user salt, 64-byte key, both stored hex ([`server/src/auth/passwords.ts`](../../../server/src/auth/passwords.ts)). Chosen because it ships with Node — no dependency to install, audit or update on a machine someone is hosting at home — and it is the only algorithm in the standard library designed for passwords (`createHash('sha256')` is not). bcrypt/argon2 would each have been a native module on top of `better-sqlite3`.
- **`GET /api/auth/me` is mounted behind `requireAuth`** rather than being an exception to it. "No valid session" is exactly the 401 the middleware answers with, so implementing it twice would have been the only way to keep `me` outside. Login and logout remain the two unauthenticated auth routes, and `requireAuth` still has a production consumer from day one.
- **`requireAuth` is applied per router, not as a blanket `app.use('/api', …)`.** A blanket mount would turn every unknown `/api` path into a 401 and break the existing 404-is-JSON contract from TICKET-SRV-01. [`app.ts`](../../../server/src/app.ts) carries the comment that later routers mount behind it.
- **A malformed login body (missing field, non-string, blank identifier) is a 400**, not one of the identical 401s — it is a broken request rather than a rejected credential, and it enumerates nothing.
- **A disabled user's existing sessions stop resolving**, not just their ability to sign in ([`server/src/auth/sessions.ts`](../../../server/src/auth/sessions.ts)), so disabling an account in TICKET-AUTH-03 takes effect on the next request rather than at their next sign-in.
- **The session cookie gets a one-year `Max-Age`.** The `sessions` row has no expiry, so a browser-session cookie would silently end a session the server still considers live.
- **No `cookie-parser` dependency**: Express sets cookies on its own and reading one out of the request header is the six-line `readCookie` in [`server/src/auth/cookies.ts`](../../../server/src/auth/cookies.ts).
- **`PublicUser` lives in [`server/src/types.ts`](../../../server/src/types.ts)**, server-side. The "shared types module" cannot literally be shared: TICKET-SRV-01's ESLint guards block imports across the client/server seam in both directions, so TICKET-AUTH-02 hand-mirrors the type on the Angular side.
- **Drizzle column names are camelCase** (`displayName`, `passwordUpdatedAt`), matching the entity field names the client already uses, so a row and its JSON shape read the same. TICKET-SRV-02 inherits this.
- The generated migration was renamed from drizzle-kit's random tag to [`0000_users_and_sessions.sql`](../../../server/drizzle/0000_users_and_sessions.sql) (journal tag updated to match) — it had not shipped yet. `/api/health` now reports `schemaVersion: 1`, which is what the two TICKET-SRV-01 specs asserting an empty schema were updated to expect.

## Review fixes (2026-09-23)

The `conventions-reviewer` pass on the finished diff found five things worth fixing before the
commit, three of them in the migration — which had not shipped, making that the last moment they
were free.

1. **Login leaked whether an account exists, through timing.** The response bodies were already
   byte-identical, but an unknown identifier returned *before* any scrypt derivation while a wrong
   password paid the full cost: a measured **78.8 ms vs 2.0 ms**, a ~40x gap answering "does this
   account exist?" from one request. That is the exact question the shared wording exists to
   refuse, and the ticket listed enumeration resistance as a goal rather than a non-goal — so it
   was over-claiming what it shipped. The route now verifies an unmatchable digest when the
   identifier is unknown, computing the result *before* the branch so short-circuiting cannot
   reopen the gap. Re-measured after the fix: **83.6 ms vs 85.4 ms, a 1.02x ratio**. Guarded by a
   spec that counts derivations rather than asserting on timings.
2. **A malformed session cookie was a 500, not a 401.** `decodeURIComponent` throws on an invalid
   percent sequence (`mm_session=%zz`), and `readCookie` runs inside synchronous middleware — so
   unauthenticated input could both fail `/logout` (contradicting its documented idempotence) and
   write stack traces to the operator's log. It was the only route by which an unauthenticated
   request could produce a 5xx at all. An undecodable cookie is now treated as absent. Confirmed:
   `me` → 401, `logout` → 204.
3. **The stored digest recorded no scrypt parameters**, so the cost could never have been raised
   without invalidating every existing password. Digests are now self-describing
   (`scrypt$16384$8$1$<hex>`) and verification re-derives with the parameters *that row* recorded,
   which is what lets a later ticket raise the cost and re-hash on next login. The parameters are
   also pinned explicitly rather than inherited from Node's defaults.
4. **`sessions.userId` was unindexed.** SQLite does not index a foreign key column on its own, so
   the `ON DELETE CASCADE` — and the session sweeps in TICKET-AUTH-03 and TICKET-AUTH-04 — scanned
   the table. Irrelevant at household scale, but a second migration to add later.
5. **`role` had no CHECK constraint.** Drizzle's SQLite `enum` is types-only and generated a bare
   `text` column, so any string could land there and be handed to the client typed as `UserRole` —
   and TICKET-AUTH-03 accepts a role from a request body, where the type system cannot help either.
   Retrofitting a CHECK to SQLite means rebuilding the table. Now `CHECK (role IN ('admin','user'))`,
   verified to reject an unexpected role at the database level.

Regenerating the migration for 4 and 5 also re-confirmed the tag rename is safe: drizzle-kit chains
the next migration off `idx`, never the tag.

## Acceptance criteria

- [x] A first boot against an empty database creates exactly one user, `admin` / `admin`, with role `admin`. (`seedAdminUser` in [`server/src/auth/seed.ts`](../../../server/src/auth/seed.ts); [`seed.spec.ts`](../../../server/src/auth/seed.spec.ts) → "creates exactly one admin / admin account on a first boot" asserts one row, role `admin`, `verifyPassword('admin')` true and `passwordUpdatedAt === createdAt`. Also observed on a real boot against a temp `DB_FILE`: the process logged "Seeded the first account: admin / admin" and `POST /api/auth/login` returned `{"id":1,"email":"admin","displayName":"Administrator","role":"admin"}`.)
- [x] A second boot with users present seeds nothing, asserted by a test that changes the admin's password, restarts, and confirms the change survived. ([`seed.spec.ts`](../../../server/src/auth/seed.spec.ts) → "seeds nothing on a second boot, so a changed password survives a restart" (`seedAdminUser` returns `false`, the new password verifies, `admin` no longer does) plus "never resurrects a deleted admin once other users exist". Confirmed live too: restarting the smoke server printed no seed line and `admin`/`admin` still signed in.)
- [x] `POST /api/auth/login` with the seeded credentials returns 200, the public user shape, and a `Set-Cookie` with `HttpOnly`. ([`server/src/routes/auth.ts`](../../../server/src/routes/auth.ts); [`auth.spec.ts`](../../../server/src/routes/auth.spec.ts) → "signs the seeded admin in and returns the public user with an HttpOnly cookie" checks the exact body, `HttpOnly`, `SameSite=Lax` and the matching `sessions` row.)
- [x] Wrong password, unknown email, and a `disabled` user each return **401 with byte-identical bodies**, asserted by a test comparing all three responses. ([`auth.spec.ts`](../../../server/src/routes/auth.spec.ts) → "answers a wrong password, an unknown email and a disabled account identically": three raw `response.text()` bodies collapse to a `Set` of size 1, all 401, body `{"error":"Incorrect email or password"}`, no cookie set and no session row created.)
- [x] `GET /api/auth/me` returns the user for a valid cookie and 401 for a missing, malformed, or deleted-session cookie. ([`auth.spec.ts`](../../../server/src/routes/auth.spec.ts) → "returns the signed-in user for a valid cookie" and "401s for a missing, malformed or deleted-session cookie" (no cookie / `cookie: not-a-cookie` / unknown 64-hex token / a token whose row was deleted).)
- [x] `POST /api/auth/logout` deletes the session row, and reusing that cookie afterwards 401s. ([`auth.spec.ts`](../../../server/src/routes/auth.spec.ts) → "deletes the session row, clears the cookie, and 401s if the cookie is reused", plus "is idempotent: signing out without a session is a 204".)
- [x] `passwordHash` and `passwordSalt` appear in **no** response body — asserted by a test that serialises every auth response and greps for the stored hash. ([`auth.spec.ts`](../../../server/src/routes/auth.spec.ts) → "leaks neither the hash nor the salt in any auth response" concatenates the body *and* `Set-Cookie` of five auth responses and asserts the stored hash, the stored salt and both field names are absent. `toPublicUser` in [`server/src/auth/users.ts`](../../../server/src/auth/users.ts) is the single place a row becomes a response shape.)
- [x] The same password produces different hashes for two users (per-user salt), and verification uses `timingSafeEqual`. ([`passwords.spec.ts`](../../../server/src/auth/passwords.spec.ts) → "gives two users with the same password different salts and different hashes"; "accepts the right password and rejects the wrong one, via timingSafeEqual" mocks `node:crypto` to count `timingSafeEqual` calls (2 for 2 verifications).)
- [x] `requireAuth` rejects an unauthenticated request to a route mounted behind it, covered by a test against a throwaway protected route. ([`server/src/middleware/require-auth.ts`](../../../server/src/middleware/require-auth.ts); [`auth.spec.ts`](../../../server/src/routes/auth.spec.ts) → the "api: requireAuth" block builds a throwaway Express app with one `/guarded` route behind `createRequireAuth(db)`: 401 `{"error":"Not signed in"}` anonymously, 200 with the user for a valid cookie, and 401 for a session whose user was disabled afterwards.)
- [x] Deleting a user cascades its session rows away. (`ON DELETE CASCADE` in [`server/src/schema/sessions.ts`](../../../server/src/schema/sessions.ts) with `foreign_keys = ON` from `openDatabase`; [`auth.spec.ts`](../../../server/src/routes/auth.spec.ts) → "db: sessions cascade" deletes the user and finds zero sessions.)
- [x] Backend tests cover every case above against an in-memory database. (`npm run test:server` → 10 files, 44 tests passing; every auth spec goes through `startTestAppWithDb()` in [`app.testing.ts`](../../../server/src/app.testing.ts), which opens `:memory:` — no spec touches `server/data/`.)
- [x] Verified via the fallow skill and coding-conventions skill. (`npx fallow dead-code --baseline .fallow-baseline.json --fail-on-issues --quiet` and `npx fallow health --complexity --max-cognitive 30 --max-cyclomatic 30 --max-crap 1000 --fail-on-issues --quiet` both exit 0; fallow's health graph does read `server/src/`, where the most complex new function is `readCookie` at 6 cyclomatic / 8 cognitive. Conventions checked by hand against `.claude/skills/coding-conventions/SKILL.md` §Backend and the project-map Server section — the `conventions-reviewer` subagent cannot be spawned from ticket-worker mode — plus `npm run lint --prefix server`, `npm run typecheck --prefix server`, `ng lint`, `ng test` (3602) and `ng build --configuration development`, all clean.)

## Notes

- **Deliberate non-goals, because this is local-only hosting.** Recorded here so a later reader knows they were decisions and not oversights: no HTTPS, no CSRF tokens, no login rate limiting or lockout, no session expiry or rotation, no password strength rules, no email verification, no password-reset-by-email flow (an admin resets it for you — [TICKET-AUTH-03](./TICKET-AUTH-03-admin-user-management.md)), no audit log. **Do not put this server on the public internet.** That sentence belongs in the README from [TICKET-SRV-09](../../server/tickets/TICKET-SRV-09-single-process-local-hosting.md).
- **Passwords are hashed anyway** even though the brief was "should not be secure": `scrypt` from the standard library is five lines and no dependency, and it means the SQLite file — which gets copied around as a backup — is not a plaintext password list for whatever people reused. This was confirmed with the user when the ticket was written.
- The identical-401-for-everything rule is not security theatre here so much as **simplicity**: one failure path, one message, one test.
- Keeping the identifier free-text rather than validated as an email is what makes the literal `admin` / `admin` seed work. If email-format validation is ever wanted, the seeded account has to change with it.
