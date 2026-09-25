/**
 * The one place a stored row becomes something a response may contain (TICKET-SRV-03) — the
 * `toPublicUser` of the entity API.
 *
 * Responses are the **entity shapes the repositories already return**, so TICKET-SRV-05 can swap a
 * repository's Dexie call for a `fetch` without touching a single caller. Two things separate a
 * row from that shape:
 *
 * - `userId`. It exists on every table and on no entity type — it is how the server scopes rows,
 *   not something the app models.
 * - `null`. SQLite has no "absent"; `Account.iban` and its kind are optional fields that simply
 *   were not there in IndexedDB. Dropping nulls is what makes `'iban' in account` read the same
 *   over HTTP as it did against Dexie.
 *
 * The one column where `null` is a value rather than an absence — `categoryModelSettings
 * .trainingWindowYears`, where it means "train on everything" — is a singleton, and its endpoint
 * layers the row over `DEFAULT_CATEGORY_MODEL_SETTINGS`, which carries the null back.
 */

/** A row as Drizzle read it, minus what the entity shape has no field for. */
export const toEntity = (
  row: Record<string, unknown>,
  hidden: readonly string[] = [],
): Record<string, unknown> =>
  Object.fromEntries(
    Object.entries(row).filter(
      ([key, value]) => key !== 'userId' && value !== null && !hidden.includes(key),
    ),
  );
