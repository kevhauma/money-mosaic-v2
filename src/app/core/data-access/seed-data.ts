/**
 * The Angular app's door onto the shared first-run seed data — the mapping-profile templates, the
 * default categories and the default transfer settings that Dexie's `on('populate')` hook writes
 * into a new browser database.
 *
 * Same arrangement, and same reason, as its sibling `entities.ts`: the constants live in
 * `shared/seed-data.ts` so the server's `seedUserDefaults` seeds a new user with the very same
 * rows (TICKET-SRV-02), and this re-export keeps every `src/app/` import path unchanged.
 */
export * from 'shared/seed-data';
