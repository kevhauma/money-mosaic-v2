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
