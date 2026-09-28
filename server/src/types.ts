/**
 * Wire shapes the API speaks. Kept in one module rather than next to a route because several
 * routes and the auth middleware all describe the same user.
 *
 * The Angular client **hand-mirrors** these types (TICKET-AUTH-02). It cannot import them: the two
 * workspaces are separated by an ESLint guard in both directions (TICKET-SRV-01), so anything
 * genuinely common is written twice on purpose rather than reaching across the seam.
 */

/** What a user is allowed to do. `admin` additionally manages other accounts (TICKET-AUTH-03). */
export type UserRole = 'admin' | 'user';

/**
 * The only user shape that ever reaches a response body. `passwordHash` and `passwordSalt` are
 * deliberately absent — see `toPublicUser`, which is the single place a row becomes this.
 */
export type PublicUser = {
  readonly id: number;
  readonly email: string;
  readonly displayName: string;
  readonly role: UserRole;
};

/**
 * A user as the *session* endpoints describe them (TICKET-AUTH-04) — `PublicUser` plus the one fact
 * only the account holder is told about themselves.
 *
 * Separate from `PublicUser` because the admin panel's user list (TICKET-AUTH-03) answers "who else
 * exists", not "what should I be nagged about", and a flag on every row there would invite exactly
 * the cross-account reading this shape refuses.
 */
export type SessionUser = PublicUser & {
  /**
   * This account is the seeded `admin` and its password has never been changed — the one credential
   * every installation of this app shares. The client turns it into an admin-only reminder banner;
   * nothing is blocked either way (see TICKET-AUTH-04's "no forced change").
   */
  readonly usingDefaultPassword: boolean;
};
