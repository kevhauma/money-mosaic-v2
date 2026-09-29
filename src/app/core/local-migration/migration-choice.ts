/**
 * What this browser remembers about the offer to move its database, per account (TICKET-SRV-07).
 *
 * `localStorage`, keyed by user id, and deliberately not a server setting: the whole point of the
 * offer is that it comes *before* the account has any usable state, and a per-browser fact is what
 * it genuinely is — the database sits in this browser and nowhere else, so another device has no
 * business inheriting the answer.
 *
 * **"Remind me later" is not stored.** Only `'never'` and `'done'` are: later means later, which is
 * the next sign-in, and a persisted "later" would be indistinguishable from "never" without a
 * timestamp nobody asked for. The service holds that one in memory for the session.
 */

export type LocalMigrationChoice = 'never' | 'done';

const KEY_PREFIX = 'mm-local-migration';

const keyFor = (userId: number): string => `${KEY_PREFIX}:${userId}`;

const CHOICES: readonly LocalMigrationChoice[] = ['never', 'done'];

/** What this browser was told last time, for this account. */
export const readLocalMigrationChoice = (userId: number): LocalMigrationChoice | null => {
  try {
    const stored = localStorage.getItem(keyFor(userId));
    return CHOICES.includes(stored as LocalMigrationChoice)
      ? (stored as LocalMigrationChoice)
      : null;
  } catch {
    // Storage disabled (private mode, a locked-down profile). The offer simply comes back, which
    // is the safe half of this decision to get wrong.
    return null;
  }
};

export const writeLocalMigrationChoice = (userId: number, choice: LocalMigrationChoice): void => {
  try {
    localStorage.setItem(keyFor(userId), choice);
  } catch {
    // As above — an un-rememberable "never" is an offer shown once more, not a failure to report.
  }
};

/** Forgets the answer, so the Data section can offer the move again after it was declined. */
export const clearLocalMigrationChoice = (userId: number): void => {
  try {
    localStorage.removeItem(keyFor(userId));
  } catch {
    // As above.
  }
};
