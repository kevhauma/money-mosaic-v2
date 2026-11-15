/**
 * The signed-in user as the API describes it — a **hand-written mirror** of `PublicUser` in
 * `server/src/types.ts` (TICKET-AUTH-02).
 *
 * It is not imported from there, and not moved into the repo-root `shared/` workspace either:
 * ESLint blocks `src/**` ↔ `server/**` in both directions (TICKET-SRV-01), and `shared/` is for
 * what both sides *persist* — the entity types the repositories and Drizzle agree on. This is a wire shape
 * the server owns and the client reads, so the seam is honest: two small declarations that a
 * response-shape change breaks loudly on one side, rather than one type pretending the two
 * workspaces are one. The server's own comment records the same decision from its end.
 */

/** What a user is allowed to do. `admin` additionally manages other accounts (TICKET-AUTH-03). */
export type UserRole = 'admin' | 'user';

export type PublicUser = {
  readonly id: number;
  readonly email: string;
  readonly displayName: string;
  readonly role: UserRole;
};

/**
 * A user as the **admin panel** describes them (TICKET-AUTH-03) — the mirror of `AdminUser` in
 * `server/src/types.ts`.
 *
 * The two timestamps are ISO-8601 strings, which is what arrives over JSON; they are not parsed into
 * `Date`s anywhere, since the panel only ever shows them. Deliberately no `usingDefaultPassword`:
 * that is the one thing the server tells an account about *itself* (`SessionUser`), and this shape
 * describes everybody else.
 */
export type AdminUser = PublicUser & {
  /** Locked out: the account cannot sign in, and its open sessions were ended. Not deleted. */
  readonly disabled: boolean;
  readonly createdAt: string;
  readonly passwordUpdatedAt: string;
};

/** What `POST /api/admin/users` takes. `role` is explicit — the create dialog always asks. */
export type NewAccount = {
  readonly email: string;
  readonly displayName: string;
  readonly password: string;
  readonly role: UserRole;
};

/** What `PATCH /api/admin/users/:id` takes: any subset, and a field left out is left alone. */
export type AdminUserChanges = {
  readonly displayName?: string;
  readonly role?: UserRole;
  readonly disabled?: boolean;
};

/**
 * What the session endpoints (`login`, `me`, `password`, `PATCH me`) answer with — `PublicUser` plus
 * the one fact the server only tells an account about itself (TICKET-AUTH-04).
 */
export type SessionUser = PublicUser & {
  /**
   * This is the seeded `admin` account, still on the `admin` password every installation of this app
   * ships with. `SessionStore.showDefaultPasswordNotice` turns it into the reminder banner; nothing
   * is blocked either way — the banner nags, it does not gate.
   */
  readonly usingDefaultPassword: boolean;
};

/**
 * One of the caller's MCP tokens (TICKET-MCP-05) — the mirror of `OwnApiToken` in
 * `server/src/auth/api-tokens.ts`. `createdAt` is the ISO string JSON delivers.
 */
export type ApiToken = {
  readonly id: number;
  readonly name: string;
  readonly createdAt: string;
};

/** What creating a token answers: the token itself, which is never sent again. */
export type IssuedApiToken = ApiToken & { readonly token: string };
