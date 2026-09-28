import type { UserRow } from '../schema/users.js';
import type { SessionUser } from '../types.js';
import { SEED_ADMIN_EMAIL } from './seed.js';
import { normaliseEmail, toPublicUser } from './users.js';

/**
 * Whether this row is the `admin` account every installation ships with, still on the password it
 * shipped with (TICKET-AUTH-04).
 *
 * Two conditions, both necessary. `passwordUpdatedAt === createdAt` alone would flag every freshly
 * created account — an admin who picks a colleague's first password has not left a *shared* secret
 * in place, and nagging them about it would teach people to ignore the banner. And the seeded
 * identifier alone would keep nagging after the password was changed, which is the state the whole
 * reminder exists to reach.
 *
 * It reads the timestamps rather than testing the password because the digest is one-way: nothing
 * on this server can ask "is this still `admin`?" — only "has it ever been replaced?".
 *
 * Two known ways this answers `false` while the shipped password is in fact still in place, both
 * accepted: setting the password *back* to `admin` silences it for good, and renaming the seeded
 * account (which TICKET-AUTH-03 will allow) breaks the identifier half. Keying off something the
 * user cannot move — a `seeded` column — is the fix if that second one ever matters; it is not worth
 * a schema version for a reminder.
 *
 * `normaliseEmail` on the constant rather than comparing it raw: `email` is a normalised column
 * (every write goes through `normaliseEmail`), so this states that invariant instead of relying on
 * the constant happening to be lowercase and free of whitespace.
 */
export const usingDefaultPassword = (row: UserRow): boolean =>
  row.email === normaliseEmail(SEED_ADMIN_EMAIL) &&
  row.passwordUpdatedAt.getTime() === row.createdAt.getTime();

/**
 * A row as the session endpoints describe it — `toPublicUser` plus the default-password flag, which
 * only ever describes the account doing the asking.
 *
 * Lives in its own module rather than next to `toPublicUser`: the flag needs the seeded
 * identifier, and `seed.ts` already imports `normaliseEmail` from `users.ts`, so reaching the other
 * way from there would make the two modules a cycle.
 */
export const toSessionUser = (row: UserRow): SessionUser => ({
  ...toPublicUser(row),
  usingDefaultPassword: usingDefaultPassword(row),
});
