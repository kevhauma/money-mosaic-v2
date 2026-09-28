/**
 * The signed-in user as the API describes it — a **hand-written mirror** of `PublicUser` in
 * `server/src/types.ts` (TICKET-AUTH-02).
 *
 * It is not imported from there, and not moved into the repo-root `shared/` workspace either:
 * ESLint blocks `src/**` ↔ `server/**` in both directions (TICKET-SRV-01), and `shared/` is for
 * what both sides *persist* — the entity types Dexie and Drizzle agree on. This is a wire shape
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
