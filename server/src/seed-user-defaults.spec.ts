import { eq } from 'drizzle-orm';
import { describe, expect, it } from 'vitest';

import {
  DEFAULT_CATEGORIES,
  DEFAULT_MAPPING_PROFILE_TEMPLATES,
  DEFAULT_TRANSFER_SETTINGS,
} from 'shared/seed-data.js';

import { seedAdminUser } from './auth/seed.js';
import { createTestUser, freshDatabase } from './db.testing.js';
import { categories } from './schema/categories.js';
import { mappingProfiles } from './schema/mapping-profiles.js';
import { transferSettings } from './schema/transfer-settings.js';
import { users } from './schema/users.js';
import { seedUserDefaults } from './seed-user-defaults.js';

/**
 * `seedUserDefaults` against the very constants Dexie's `populate` hook writes (TICKET-SRV-02).
 *
 * The comparison is deliberately against `shared/seed-data.ts` — the module
 * `src/app/core/data-access/seed-data.ts` re-exports and `app-db.ts` re-exports in turn, so these
 * are literally the objects a fresh browser database is populated from. A second hand-written copy
 * here would only prove that two hand-written copies agree.
 */

/** A row as the seed constants describe it: without the server's own `id` and `userId`. */
const withoutOwnership = <T extends { id?: unknown; userId?: unknown }>({
  id: _id,
  userId: _userId,
  ...rest
}: T) => rest;

describe('seedUserDefaults', () => {
  it('writes the same categories a fresh Dexie database is populated with', () => {
    const { db } = freshDatabase();
    const userId = createTestUser(db, 'a');

    seedUserDefaults(db, userId);

    const seeded = db.select().from(categories).where(eq(categories.userId, userId)).all();
    expect(seeded).toHaveLength(DEFAULT_CATEGORIES.length);
    expect(seeded.map(withoutOwnership)).toEqual(
      DEFAULT_CATEGORIES.map((category) => ({
        name: category.name,
        kind: category.kind,
        group: category.group ?? null,
        color: category.color,
        icon: category.icon,
        archived: category.archived,
        isSystem: category.isSystem,
        sortOrder: category.sortOrder ?? null,
        activeFrom: category.activeFrom ?? null,
        activeUntil: category.activeUntil ?? null,
      })),
    );
  });

  it('writes the KBC and Belfius mapping-profile templates, ownIban and headerSignature included', () => {
    const { db } = freshDatabase();
    const userId = createTestUser(db, 'a');

    seedUserDefaults(db, userId);

    const seeded = db
      .select()
      .from(mappingProfiles)
      .where(eq(mappingProfiles.userId, userId))
      .all();
    expect(seeded.map((profile) => profile.name)).toEqual(['KBC', 'Belfius']);
    expect(seeded.map(withoutOwnership)).toEqual(
      DEFAULT_MAPPING_PROFILE_TEMPLATES.map((profile) => ({
        name: profile.name,
        bankPreset: profile.bankPreset ?? null,
        headerSignature: profile.headerSignature ?? null,
        delimiter: profile.delimiter,
        decimalSeparator: profile.decimalSeparator,
        dateFormat: profile.dateFormat,
        encoding: profile.encoding,
        headerRows: profile.headerRows,
        signConvention: profile.signConvention,
        columns: profile.columns,
        defaultAccountId: profile.defaultAccountId ?? null,
      })),
    );
    // The v3/v4 backfills are part of the constants, so they arrive with the template.
    expect(seeded.map((profile) => profile.columns.ownIban)).toEqual([
      'Rekeningnummer',
      'Rekening',
    ]);
  });

  it('writes the default transfer settings, dropping the old singleton id', () => {
    const { db } = freshDatabase();
    const userId = createTestUser(db, 'a');

    seedUserDefaults(db, userId);

    const row = db.select().from(transferSettings).where(eq(transferSettings.userId, userId)).get();
    expect(row).toEqual({
      userId,
      matchWindowDays: DEFAULT_TRANSFER_SETTINGS.matchWindowDays,
      autoLinkMediumConfidence: DEFAULT_TRANSFER_SETTINGS.autoLinkMediumConfidence,
    });
  });

  it('gives two users their own copy, neither visible in the other scope', () => {
    const { db } = freshDatabase();
    const first = createTestUser(db, 'a');
    const second = createTestUser(db, 'b');

    seedUserDefaults(db, first);
    seedUserDefaults(db, second);

    const firstCategories = db.select().from(categories).where(eq(categories.userId, first)).all();
    const secondCategories = db
      .select()
      .from(categories)
      .where(eq(categories.userId, second))
      .all();

    expect(firstCategories).toHaveLength(DEFAULT_CATEGORIES.length);
    expect(secondCategories).toHaveLength(DEFAULT_CATEGORIES.length);
    // Same names, different rows: ids are unique per table across all users, never contiguous.
    expect(secondCategories.map((row) => row.name)).toEqual(firstCategories.map((row) => row.name));
    expect(
      firstCategories.some((row) => secondCategories.some((other) => other.id === row.id)),
    ).toBe(false);
    expect(db.select().from(transferSettings).all()).toHaveLength(2);
  });

  it('runs for the first-boot admin, so a seeded installation is never empty', async () => {
    const { db } = freshDatabase();

    await seedAdminUser(db);

    const admin = db.select().from(users).get();
    expect(db.select().from(categories).where(eq(categories.userId, admin!.id)).all()).toHaveLength(
      DEFAULT_CATEGORIES.length,
    );
    expect(db.select().from(mappingProfiles).all()).toHaveLength(
      DEFAULT_MAPPING_PROFILE_TEMPLATES.length,
    );
    expect(db.select().from(transferSettings).all()).toHaveLength(1);
  });

  it('leaves nothing behind when the user is deleted', () => {
    const { db } = freshDatabase();
    const userId = createTestUser(db, 'a');
    seedUserDefaults(db, userId);

    db.delete(users).where(eq(users.id, userId)).run();

    expect(db.select().from(categories).all()).toHaveLength(0);
    expect(db.select().from(mappingProfiles).all()).toHaveLength(0);
    expect(db.select().from(transferSettings).all()).toHaveLength(0);
  });
});
