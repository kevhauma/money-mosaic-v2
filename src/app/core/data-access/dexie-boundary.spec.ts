import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

/**
 * The gap test for the pivot (TICKET-SRV-05): **nothing in this folder reads the browser database
 * any more.**
 *
 * Every repository here used to be a wrapper over a Dexie table and is now one over an `/api` route.
 * The thing that would quietly undo that is a single method left behind — or added later by someone
 * copying the file next to it — still calling `appDb`, which would read one entity out of a database
 * the rest of the app has stopped writing to. That is invisible at runtime (the table is simply
 * empty) and invisible in review (it looks exactly like the code that was there last month), so it
 * is asserted here rather than trusted.
 *
 * Source-level, and by identifier rather than by import path: a repository that reached `appDb`
 * through the folder's own barrel would pass an import-path check and fail this one.
 *
 * `app-db.ts` itself survives until TICKET-SRV-08 deletes it, because TICKET-SRV-07's one-time
 * migration reads the old database to upload it. That file and its spec are this folder's only
 * exemptions — the migration reader deliberately went *outside* the folder, to
 * `core/local-migration/local-database.ts`, so this rule could stay absolute rather than grow a
 * third name. TICKET-SRV-08 deletes both sides.
 */
const DATA_ACCESS = join(process.cwd(), 'src', 'app', 'core', 'data-access');

const MAY_NAME_THE_DATABASE = [
  'app-db.ts',
  'app-db.spec.ts',
  // This file, which has to spell the name in order to look for it.
  'dexie-boundary.spec.ts',
];

/**
 * Comments stripped before the match: a doc comment *explaining* what the code used to do — and
 * several of them do, because that is the interesting half of the change — is not a read.
 */
const codeOf = (source: string): string =>
  source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');

describe('the data-access layer no longer reads the browser database', () => {
  const files = readdirSync(DATA_ACCESS).filter(
    (name) => name.endsWith('.ts') && !MAY_NAME_THE_DATABASE.includes(name),
  );

  it('finds the folder, so an empty pass cannot look like a passing one', () => {
    expect(files.length).toBeGreaterThan(20);
    expect(files).toContain('accounts.repository.ts');
  });

  it.each(files)('%s', (name) => {
    expect(codeOf(readFileSync(join(DATA_ACCESS, name), 'utf8'))).not.toMatch(/\bappDb\b/);
  });
});
