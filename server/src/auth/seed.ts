import { count } from 'drizzle-orm';

import type { DrizzleDb } from '../db.js';
import { users } from '../schema/users.js';
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
 * Returns whether it inserted, which is what the specs assert on.
 */
export const seedAdminUser = async (db: DrizzleDb): Promise<boolean> => {
  const existing = db.select({ value: count() }).from(users).get();
  if ((existing?.value ?? 0) > 0) return false;

  const digest = await hashPassword(SEED_ADMIN_PASSWORD);
  // One timestamp for both columns: TICKET-AUTH-04 reads `passwordUpdatedAt === createdAt` as
  // "the seeded password was never changed".
  const now = new Date();
  db.insert(users)
    .values({
      email: normaliseEmail(SEED_ADMIN_EMAIL),
      displayName: SEED_ADMIN_DISPLAY_NAME,
      ...digest,
      role: 'admin',
      disabled: false,
      createdAt: now,
      passwordUpdatedAt: now,
    })
    .run();
  return true;
};
