import { describe, expect, it } from 'vitest';

import { apiFetch, apiJson } from '../app.testing.js';
import { SETTINGS_TABLES } from './settings.js';
import { startTwoUserApp } from './samples.testing.js';

/**
 * The seven singleton settings endpoints (TICKET-SRV-03, `uiPreferences` since TICKET-SRV-10).
 *
 * Two properties matter more than the CRUD: an **unwritten** row has to read exactly like the
 * `DEFAULT_*` the Dexie repository falls back to — the tri-state the ngrx stores depend on — and a
 * patch has to *merge*, server-side, inside a transaction. The second is what the fourteen
 * `AppSettingsRepository` setters could never guarantee on their own: two tabs each doing
 * read-merge-put would write each other's field away.
 */

type Settings = Record<string, unknown>;

/** The defaults as they look once JSON has dropped every `undefined`. */
const asJson = (value: unknown): unknown => JSON.parse(JSON.stringify(value));

const eachSettings = SETTINGS_TABLES.map(
  (settings) => [settings.name, settings] as [string, (typeof SETTINGS_TABLES)[number]],
);

describe.each(eachSettings)('/api/settings/%s', (name, settings) => {
  const path = `/api/settings/${name}`;

  it('answers an unwritten row with the shared defaults', async () => {
    const { app, alice } = await startTwoUserApp();

    const read = await apiJson<Settings>(app, path, { as: alice.session });

    expect(read.status).toBe(200);
    expect(read.body).toEqual(asJson(settings.defaults));
  });

  it('creates the row on the first patch, and merges into it afterwards', async () => {
    const { app, alice } = await startTwoUserApp();
    // Two of these singletons have a single column, so the merge half of the assertion is only
    // meaningful — and only made — for the four that have more than one.
    const [first, second] = Object.entries(PATCHES[name]!);

    const created = await apiJson<Settings>(app, path, {
      as: alice.session,
      method: 'PATCH',
      body: Object.fromEntries([first!]),
    });
    expect(created.status).toBe(200);
    expect(created.body[first![0]]).toEqual(first![1]);

    if (second !== undefined) {
      const merged = await apiJson<Settings>(app, path, {
        as: alice.session,
        method: 'PATCH',
        body: Object.fromEntries([second]),
      });

      // The second patch names one field; the first one's value is still there.
      expect(merged.body[first![0]]).toEqual(first![1]);
      expect(merged.body[second[0]]).toEqual(second[1]);
    }

    const read = await apiJson<Settings>(app, path, { as: alice.session });
    expect(read.body[first![0]]).toEqual(first![1]);
  });

  it("leaves another user's row alone", async () => {
    const { app, alice, bob } = await startTwoUserApp();
    const [field, value] = Object.entries(PATCHES[name]!)[0]!;

    await apiFetch(app, path, { as: alice.session, method: 'PATCH', body: { [field]: value } });

    const theirs = await apiJson<Settings>(app, path, { as: bob.session });
    expect(theirs.body).toEqual(asJson(settings.defaults));
  });

  it('rejects an unknown field', async () => {
    const { app, alice } = await startTwoUserApp();

    const response = await apiJson<{ error: string }>(app, path, {
      as: alice.session,
      method: 'PATCH',
      body: { notAColumn: 1 },
    });

    expect(response.status).toBe(400);
    expect(response.body.error).toContain('notAColumn');
  });
});

/**
 * The theme is the one value here a client sends from a catalogue that can change under it: a
 * build that still offers a retired theme must get a 400 it can read, not a CHECK-constraint 500.
 */
describe('/api/settings/uiPreferences', () => {
  it('refuses a theme id that is not in the catalogue', async () => {
    const { app, alice } = await startTwoUserApp();

    const response = await apiJson<{ error: string }>(app, '/api/settings/uiPreferences', {
      as: alice.session,
      method: 'PATCH',
      body: { themeStyle: 'not-a-theme' },
    });

    expect(response.status).toBe(400);
    expect(response.body.error).toContain('themeStyle');
  });
});

/** Two independent fields per singleton — enough to prove a merge rather than a replace. */
const PATCHES: Record<string, Record<string, unknown>> = {
  appSettings: { locale: 'en-BE', privacyMode: true },
  transferSettings: { matchWindowDays: 5, autoLinkMediumConfidence: false },
  forecastSettings: { lookbackMonths: 12, safetyNetAmount: 500 },
  categoryComparisonSettings: { excludedCategoryIds: [1, 2] },
  dashboardLayoutSettings: { hiddenRowIds: ['stats'], rowOrder: ['stats'] },
  categoryModelSettings: { trainingWindowYears: 3 },
  uiPreferences: { themeStyle: 'cyberpunk', hasVisited: true },
};

describe('concurrent patches', () => {
  it('keeps both fields when two one-field patches arrive together', async () => {
    const { app, alice } = await startTwoUserApp();
    const path = '/api/settings/appSettings';

    // The lost-update case: with a client-side read-merge-put, whichever request read first would
    // write the other's field back out.
    await Promise.all([
      apiFetch(app, path, { as: alice.session, method: 'PATCH', body: { locale: 'en-BE' } }),
      apiFetch(app, path, { as: alice.session, method: 'PATCH', body: { privacyMode: true } }),
    ]);

    const read = await apiJson<Settings>(app, path, { as: alice.session });
    expect(read.body).toEqual({ locale: 'en-BE', privacyMode: true });
  });

  it('creates the row once when two patches race to create it', async () => {
    const { app, alice } = await startTwoUserApp();
    const path = '/api/settings/forecastSettings';

    await Promise.all([
      apiFetch(app, path, { as: alice.session, method: 'PATCH', body: { lookbackMonths: 12 } }),
      apiFetch(app, path, { as: alice.session, method: 'PATCH', body: { safetyNetAmount: 500 } }),
    ]);

    const read = await apiJson<Settings>(app, path, { as: alice.session });
    expect(read.body).toMatchObject({
      lookbackMonths: 12,
      safetyNetAmount: 500,
      // Untouched by either patch, and still the default the row was created from.
      basis: 'net-cash-flow',
    });
  });
});

describe('defaults a row is created from', () => {
  it('fills the NOT NULL columns the caller did not name', async () => {
    const { app, alice } = await startTwoUserApp();

    const created = await apiJson<Settings>(app, '/api/settings/transferSettings', {
      as: alice.session,
      method: 'PATCH',
      body: { matchWindowDays: 5 },
    });

    expect(created.body).toEqual({ matchWindowDays: 5, autoLinkMediumConfidence: true });
  });

  it('keeps a meaningful null rather than dropping it', async () => {
    const { app, alice } = await startTwoUserApp();

    // `trainingWindowYears: null` means "train on everything", which is not the same as absent.
    const created = await apiJson<Settings>(app, '/api/settings/categoryModelSettings', {
      as: alice.session,
      method: 'PATCH',
      body: { trainingWindowYears: 3 },
    });
    expect(created.body).toEqual({ trainingWindowYears: 3 });

    const cleared = await apiJson<Settings>(app, '/api/settings/categoryModelSettings', {
      as: alice.session,
      method: 'PATCH',
      body: { trainingWindowYears: null },
    });
    expect(cleared.body).toEqual({ trainingWindowYears: null });
  });
});
