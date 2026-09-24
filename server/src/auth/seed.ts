import { count } from 'drizzle-orm';

import type { DrizzleDb } from '../db.js';
import { users } from '../schema/users.js';
import { seedUserDefaults } from '../seed-user-defaults.js';
import { hashPassword } from './passwords.js';
import { normaliseEmail } from './users.js';

/**
 * The identifier is literally `admin`, not `admin@local`: the login field is free text with no
 * email-format validation, because this server is reached over a LAN by people who were told
 * "admin/admin".
 */
export const SEED_ADMIN_EMAIL = 'admin';
export const SEED_ADMIN_PASSWORD = 'admin';
const SEED_ADMIN_DISPLAY_NAME = 'Administrator';

/**
 * First-boot seed: creates the `admin` / `admin` account **only when the table is empty**, so it
 * can never resurrect a deleted admin or reset a changed password. Runs on every boot; a second
 * boot is a single `count(*)` and a return.
 *
 * A new account is also given its first-run data — mapping-profile templates, default categories,
 * default transfer settings — by `seedUserDefaults` (TICKET-SRV-02). That pairing is what replaces
 * Dexie's per-database `populate` hook, and TICKET-AUTH-03's create-user endpoint repeats it.
 *
 * Returns whether it inserted, which is what the specs assert on.
 */
export const seedAdminUser = async (db: DrizzleDb): Promise<boolean> => {
  const existing = db.select({ value: count() }).from(users).get();
  if ((existing?.value ?? 0) > 0) return false;

  const digest = await hashPassword(SEED_ADMIN_PASSWORD);
  // One timestamp for both columns: TICKET-AUTH-04 reads `passwordUpdatedAt === createdAt` as
  // "the seeded password was never changed".
  const now = new Date();

  // One transaction for both halves. Seeding the defaults separately would let a failure there
  // leave an admin with no categories, no mapping profiles and no transfer settings — and the
  // `count(*)` guard above means that half-seeded state would never be retried on a later boot.
  db.transaction((tx) => {
    const inserted = tx
      .insert(users)
      .values({
        email: normaliseEmail(SEED_ADMIN_EMAIL),
        displayName: SEED_ADMIN_DISPLAY_NAME,
        ...digest,
        role: 'admin',
        disabled: false,
        createdAt: now,
        passwordUpdatedAt: now,
      })
      .returning({ id: users.id })
      .get();

    seedUserDefaults(tx, inserted.id);
  });

  return true;
};
