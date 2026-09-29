/**
 * Is there still a browser database on this machine? (TICKET-SRV-07)
 *
 * Deliberately the one module in this folder that does **not** touch Dexie. Detection runs on every
 * sign-in, for every user, forever — including the overwhelming majority who have never had a
 * pre-v3 database — and `import 'dexie'` is ~90 kB nobody should pay for an answer of "no". So the
 * cheap question is asked here, and only a "yes" (or a browser that cannot answer) reaches
 * `local-database.ts` through `LocalDatabaseGateway`'s dynamic import.
 *
 * It also must not *create* the database while looking for it. `indexedDB.open('money-mosaic')`
 * would, which would turn "nothing to migrate" into a permanently offered migration of an empty
 * database — so the listing API is used, and the one fallback that does not create is Dexie's own
 * `exists()`.
 */

/** The database `app-db.ts` declares, and the only one this app has ever created. */
export const LOCAL_DATABASE_NAME = 'money-mosaic';

type DatabaseLister = { databases?: () => Promise<{ name?: string }[]> };

/**
 * `true`/`false` when the browser can list its databases, `'unknown'` when it cannot.
 *
 * `indexedDB.databases()` is unimplemented in Firefox and absent in older Safari, so "unknown" is a
 * real third answer rather than a defensive branch — and the caller resolves it by asking Dexie,
 * which costs the download this function exists to avoid but at least only costs it once.
 */
export const listedLocalDatabase = async (): Promise<boolean | 'unknown'> => {
  const lister = (globalThis.indexedDB ?? undefined) as DatabaseLister | undefined;
  if (typeof lister?.databases !== 'function') return 'unknown';

  try {
    const databases = await lister.databases();
    return databases.some(({ name }) => name === LOCAL_DATABASE_NAME);
  } catch {
    // Some browsers reject this in private mode rather than answering an empty list.
    return 'unknown';
  }
};
