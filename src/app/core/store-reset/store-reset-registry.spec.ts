import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

/**
 * The gap test for the sign-out wipe (TICKET-AUTH-02).
 *
 * Registration is a line inside each store rather than a central list, which is what keeps the
 * reset off the eager bundle — but it is also exactly the kind of line a new store is written
 * without. So this reads the source tree instead of trusting it: every store that hydrates itself
 * must also hand its `reset`/`hydrate` pair to `StoreResetService`, or user B sees user A's data.
 *
 * Source-level rather than runtime on purpose: instantiating all seventeen stores would mean
 * mocking seventeen repositories (and booting the ML worker), and a store *nobody injected* is
 * invisible to a runtime registry check — which is precisely the store this must catch.
 */
const APP_ROOT = join(process.cwd(), 'src', 'app');

const storeFilesUnder = (directory: string): string[] =>
  readdirSync(directory).flatMap((entry) => {
    const path = join(directory, entry);
    if (statSync(path).isDirectory()) return storeFilesUnder(path);
    return entry.endsWith('.store.ts') ? [path] : [];
  });

/** A store hydrates itself when it memoises a hydration promise — the TICKET-PERF-07 shape. */
const HYDRATION_MARKER = 'let hydration';

/**
 * Stores that deliberately hold **no user data** and so are not part of the sign-out wipe.
 *
 * The list is the point: keying only off `HYDRATION_MARKER` would let a store that holds user data
 * without memoising a promise — or that names the variable something else — slip through silently.
 * Every `signalStore` in the app is either registered or named here with a reason, so forgetting
 * becomes a failing test rather than a leak.
 */
const HOLDS_NO_USER_DATA: Record<string, string> = {
  'core/auth/session.store.ts': 'owns the wipe; resetting itself mid-sign-out would be circular',
  'core/state/range-state.store.ts':
    'per-page date ranges and quick-range ids — UI choice, not data',
  'core/state/chart-options.store.ts': 'granularity, zoom and series toggles — UI choice, not data',
  'feature-dashboard/stats.store.ts':
    'pure withComputed over the entity stores — no withState/withEntities of its own, so it empties when they do',
  'feature-future/forecast.store.ts':
    'pure withComputed over the entity stores — no withState/withEntities of its own, so it empties when they do',
};

describe('store reset registry: every hydrating store registers for the sign-out wipe', () => {
  const stores = storeFilesUnder(APP_ROOT).map((path) => ({
    path: path.slice(APP_ROOT.length + 1).replaceAll('\\', '/'),
    source: readFileSync(path, 'utf-8'),
  }));

  const hydratingStores = stores.filter((store) => store.source.includes(HYDRATION_MARKER));

  it('finds the hydrating stores to check (a passing test over an empty list proves nothing)', () => {
    expect(hydratingStores.length).toBeGreaterThan(10);
  });

  it('registers each of them with StoreResetService', () => {
    const unregistered = hydratingStores
      .filter((store) => !store.source.includes('registerStoreReset('))
      .map((store) => store.path);

    expect(unregistered).toEqual([]);
  });

  it('builds each reset from createStoreReset, so the hydration cache is cleared with the state', () => {
    const handRolled = hydratingStores
      .filter((store) => !store.source.includes('createStoreReset('))
      .map((store) => store.path);

    expect(handRolled).toEqual([]);
  });

  it('accounts for every signalStore, so a store that hydrates differently cannot slip through', () => {
    // The check above only sees stores written in the memoised-promise shape. This one starts from
    // *every* store and demands each be either registered or listed as holding no user data —
    // turning "forgot" into "must justify".
    const unaccounted = stores
      .filter((store) => store.source.includes('signalStore('))
      .filter((store) => !store.source.includes('registerStoreReset('))
      .filter((store) => HOLDS_NO_USER_DATA[store.path] === undefined)
      .map((store) => store.path);

    expect(unaccounted).toEqual([]);
  });

  it('keeps the exemption list honest — a listed store that started registering is stale', () => {
    const byPath = new Map(stores.map((store) => [store.path, store]));
    const stale = Object.keys(HOLDS_NO_USER_DATA).filter((path) => {
      const store = byPath.get(path);
      return store === undefined || store.source.includes('registerStoreReset(');
    });

    expect(stale).toEqual([]);
  });
});
