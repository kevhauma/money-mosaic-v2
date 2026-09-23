import { eq } from 'drizzle-orm';
import { afterEach, describe, expect, it } from 'vitest';

import { openDatabase, runMigrations, type DatabaseHandle } from '../db.js';
import { users } from '../schema/users.js';
import { hashPassword, verifyPassword } from './passwords.js';
import { SEED_ADMIN_EMAIL, SEED_ADMIN_PASSWORD, seedAdminUser } from './seed.js';

const opened: DatabaseHandle[] = [];

/** A migrated, empty in-memory database — what a first boot opens. */
const freshDatabase = (): DatabaseHandle => {
  const handle = openDatabase(':memory:');
  opened.push(handle);
  runMigrations(handle);
  return handle;
};

afterEach(() => {
  for (const handle of opened.splice(0)) handle.close();
});

describe('auth: seedAdminUser', () => {
  it('creates exactly one admin / admin account on a first boot', async () => {
    const { db } = freshDatabase();

    expect(await seedAdminUser(db)).toBe(true);

    const rows = db.select().from(users).all();
    expect(rows).toHaveLength(1);
    const admin = rows[0];
    expect(admin).toMatchObject({
      email: SEED_ADMIN_EMAIL,
      displayName: 'Administrator',
      role: 'admin',
      disabled: false,
    });
    expect(await verifyPassword(SEED_ADMIN_PASSWORD, admin!)).toBe(true);
    // TICKET-AUTH-04 reads these being equal as "the seeded password was never changed".
    expect(admin!.passwordUpdatedAt.getTime()).toBe(admin!.createdAt.getTime());
  });

  it('seeds nothing on a second boot, so a changed password survives a restart', async () => {
    const { db } = freshDatabase();
    await seedAdminUser(db);

    const changed = await hashPassword('something-else');
    db.update(users).set(changed).where(eq(users.email, SEED_ADMIN_EMAIL)).run();

    // A restart is exactly this call again against the same (persisted) data.
    expect(await seedAdminUser(db)).toBe(false);

    const rows = db.select().from(users).all();
    expect(rows).toHaveLength(1);
    expect(await verifyPassword('something-else', rows[0]!)).toBe(true);
    expect(await verifyPassword(SEED_ADMIN_PASSWORD, rows[0]!)).toBe(false);
  });

  it('never resurrects a deleted admin once other users exist', async () => {
    const { db } = freshDatabase();
    await seedAdminUser(db);
    db.insert(users)
      .values({
        email: 'someone',
        displayName: 'Someone',
        ...(await hashPassword('pw')),
        role: 'user',
      })
      .run();
    db.delete(users).where(eq(users.email, SEED_ADMIN_EMAIL)).run();

    expect(await seedAdminUser(db)).toBe(false);
    expect(
      db
        .select()
        .from(users)
        .all()
        .map((row) => row.email),
    ).toEqual(['someone']);
  });
});
