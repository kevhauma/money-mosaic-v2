import {
  DEFAULT_CATEGORIES,
  DEFAULT_MAPPING_PROFILE_TEMPLATES,
  DEFAULT_TRANSFER_SETTINGS,
} from 'shared/seed-data.js';

import type { DbOrTx } from './db.js';
import { categories } from './schema/categories.js';
import { mappingProfiles } from './schema/mapping-profiles.js';
import { transferSettings } from './schema/transfer-settings.js';

/**
 * The first-run data a new user starts with (TICKET-SRV-02): the KBC and Belfius mapping-profile
 * templates, the ~10 default categories, and the default transfer settings.
 *
 * This is Dexie's `on('populate')` hook, moved. That hook fires once per *database*, which was the
 * right unit while a database belonged to one person; here the unit is a user, so this runs when
 * an account is created — from `seedAdminUser` on first boot, and from TICKET-AUTH-03's create-user
 * endpoint.
 *
 * **The rows themselves are not defined here.** They come from `shared/seed-data.ts`, the same
 * constants the Angular app seeds a browser database from, so the two cannot drift — which is what
 * `seed-user-defaults.spec.ts` asserts field by field.
 *
 * The `id` on each constant is dropped: `DEFAULT_TRANSFER_SETTINGS.id` is the `1` of the old
 * singleton convention, and SQLite assigns the rest.
 *
 * Takes a database **or** a transaction, and opens neither. A user must never be left holding half
 * a seed, but the atomic unit is "the user and their seed together" — so the caller owns the
 * transaction: `seedAdminUser` composes this into the same one that inserts the user, and
 * TICKET-AUTH-03's create-user endpoint will do the same.
 */
export const seedUserDefaults = (tx: DbOrTx, userId: number): void => {
  tx.insert(mappingProfiles)
    .values(
      DEFAULT_MAPPING_PROFILE_TEMPLATES.map(({ id: _id, ...profile }) => ({ ...profile, userId })),
    )
    .run();

  tx.insert(categories)
    .values(DEFAULT_CATEGORIES.map(({ id: _id, ...category }) => ({ ...category, userId })))
    .run();

  const { matchWindowDays, autoLinkMediumConfidence } = DEFAULT_TRANSFER_SETTINGS;
  tx.insert(transferSettings).values({ userId, matchWindowDays, autoLinkMediumConfidence }).run();
};
