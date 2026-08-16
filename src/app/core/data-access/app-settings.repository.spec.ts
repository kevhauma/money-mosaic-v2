import { appDb, DEFAULT_APP_SETTINGS, type AppSettings } from './app-db';
import { AppSettingsRepository } from './app-settings.repository';

describe('AppSettingsRepository', () => {
  const repository = new AppSettingsRepository();

  // Cleared on both sides: `appDb` is a module-level singleton and Vitest runs with `isolate:
  // false`, so a row left behind by an earlier spec file in this worker would otherwise leak into
  // the first test here — which asserts the table is empty.
  beforeEach(async () => {
    await appDb.appSettings.clear();
  });

  afterEach(async () => {
    await appDb.appSettings.clear();
  });

  it('falls back to the default settings before anything is written', async () => {
    expect(await repository.get()).toEqual(DEFAULT_APP_SETTINGS);
  });

  it('returns the stored row once one exists', async () => {
    // A row written before TICKET-SET-02 added `primaryColor` — Dexie doesn't enforce the TS
    // shape at runtime, so an existing user's stored row can genuinely lack the field.
    await appDb.appSettings.put({ id: 1 } as AppSettings);

    expect(await repository.get()).toEqual({ id: 1 });
  });

  it('setPrimaryColor writes the singleton row without one existing yet', async () => {
    await repository.setPrimaryColor('sky');

    expect(await repository.get()).toEqual({ id: 1, primaryColor: 'sky' });
  });

  it('setPrimaryColor overwrites the singleton row rather than adding a second one', async () => {
    await repository.setPrimaryColor('sky');
    await repository.setPrimaryColor('rose');

    expect((await repository.get()).primaryColor).toBe('rose');
    expect(await appDb.appSettings.count()).toBe(1);
  });

  it('setPrimaryColor(undefined) clears a previously chosen color', async () => {
    await repository.setPrimaryColor('sky');

    await repository.setPrimaryColor(undefined);

    expect(await repository.get()).toEqual({ id: 1, primaryColor: undefined });
  });

  it('setCurrencySymbol writes the singleton row without one existing yet', async () => {
    await repository.setCurrencySymbol('$');

    expect(await repository.get()).toEqual({ id: 1, currencySymbol: '$' });
  });

  it('setCurrencySymbol overwrites the singleton row rather than adding a second one', async () => {
    await repository.setCurrencySymbol('$');
    await repository.setCurrencySymbol('£');

    expect((await repository.get()).currencySymbol).toBe('£');
    expect(await appDb.appSettings.count()).toBe(1);
  });

  it('setCurrencySymbolPosition writes the singleton row without one existing yet', async () => {
    await repository.setCurrencySymbolPosition('after');

    expect(await repository.get()).toEqual({ id: 1, currencySymbolPosition: 'after' });
  });

  it('setCurrencySymbol and setCurrencySymbolPosition together preserve each other', async () => {
    await repository.setCurrencySymbol('$');
    await repository.setCurrencySymbolPosition('after');

    expect(await repository.get()).toEqual({
      id: 1,
      currencySymbol: '$',
      currencySymbolPosition: 'after',
    });
  });

  it('setLocale writes the singleton row without one existing yet', async () => {
    await repository.setLocale('en-GB');

    expect(await repository.get()).toEqual({ id: 1, locale: 'en-GB' });
  });

  it('setLocale overwrites the singleton row rather than adding a second one', async () => {
    await repository.setLocale('en-GB');
    await repository.setLocale('nl-BE');

    expect((await repository.get()).locale).toBe('nl-BE');
    expect(await appDb.appSettings.count()).toBe(1);
  });

  it('setLocale preserves currency settings written alongside it', async () => {
    await repository.setCurrencySymbol('$');
    await repository.setLocale('en-GB');

    expect(await repository.get()).toEqual({
      id: 1,
      currencySymbol: '$',
      locale: 'en-GB',
    });
  });

  it('setExcludedIncomeCategoryIds writes the singleton row without one existing yet (TICKET-INC-03)', async () => {
    await repository.setExcludedIncomeCategoryIds([2, 5]);

    expect(await repository.get()).toEqual({ id: 1, excludedIncomeCategoryIds: [2, 5] });
  });

  it('setExcludedIncomeCategoryIds preserves unrelated settings and stays a single row', async () => {
    await repository.setLocale('en-GB');
    await repository.setExcludedIncomeCategoryIds([2]);
    await repository.setExcludedIncomeCategoryIds([]);

    expect(await repository.get()).toEqual({
      id: 1,
      locale: 'en-GB',
      excludedIncomeCategoryIds: [],
    });
    expect(await appDb.appSettings.count()).toBe(1);
  });

  it('setCareerStartDate writes the singleton row without one existing yet (TICKET-INC-12)', async () => {
    await repository.setCareerStartDate('2019-09-01');

    expect(await repository.get()).toEqual({ id: 1, careerStartDate: '2019-09-01' });
  });

  it('setCareerStartDate preserves unrelated settings and stays a single row', async () => {
    await repository.setLocale('en-GB');
    await repository.setExcludedIncomeCategoryIds([2]);
    await repository.setCareerStartDate('2019-09-01');
    await repository.setCareerStartDate('2020-01-06');

    expect(await repository.get()).toEqual({
      id: 1,
      locale: 'en-GB',
      excludedIncomeCategoryIds: [2],
      careerStartDate: '2020-01-06',
    });
    expect(await appDb.appSettings.count()).toBe(1);
  });

  it('setCareerStartDate(undefined) clears the date without touching the rest of the row', async () => {
    await repository.setLocale('en-GB');
    await repository.setCareerStartDate('2019-09-01');

    await repository.setCareerStartDate(undefined);

    expect(await repository.get()).toEqual({
      id: 1,
      locale: 'en-GB',
      careerStartDate: undefined,
    });
  });

  it('setGrossColor writes the singleton row without one existing yet (TICKET-SET-08)', async () => {
    await repository.setGrossColor('violet');

    expect(await repository.get()).toEqual({ id: 1, grossColor: 'violet' });
  });

  it('setGrossColor preserves unrelated settings and stays a single row', async () => {
    await repository.setLocale('en-GB');
    await repository.setPrimaryColor('rose');
    await repository.setGrossColor('violet');
    await repository.setGrossColor('teal');

    expect(await repository.get()).toEqual({
      id: 1,
      locale: 'en-GB',
      primaryColor: 'rose',
      grossColor: 'teal',
    });
    expect(await appDb.appSettings.count()).toBe(1);
  });

  it('markGuideSeen records a slug on a row that does not exist yet (TICKET-PUB-08)', async () => {
    await repository.markGuideSeen('getting-started-with-the-income-page');

    expect(await repository.get()).toEqual({
      id: 1,
      seenGuideSlugs: ['getting-started-with-the-income-page'],
    });
  });

  it('markGuideSeen is idempotent — marking the same slug twice leaves one entry', async () => {
    await repository.markGuideSeen('income');
    await repository.markGuideSeen('income');

    expect((await repository.get()).seenGuideSlugs).toEqual(['income']);
  });

  it('markGuideSeen appends a second slug rather than replacing the first', async () => {
    await repository.markGuideSeen('income');
    await repository.markGuideSeen('loans');

    expect((await repository.get()).seenGuideSlugs).toEqual(['income', 'loans']);
  });

  it('markGuideSeen preserves unrelated settings and stays a single row', async () => {
    await repository.setLocale('en-GB');
    await repository.markGuideSeen('income');

    expect(await repository.get()).toEqual({
      id: 1,
      locale: 'en-GB',
      seenGuideSlugs: ['income'],
    });
    expect(await appDb.appSettings.count()).toBe(1);
  });

  it('setGrossColor(undefined) clears the color without touching the rest of the row', async () => {
    await repository.setPrimaryColor('rose');
    await repository.setGrossColor('violet');

    await repository.setGrossColor(undefined);

    expect(await repository.get()).toEqual({
      id: 1,
      primaryColor: 'rose',
      grossColor: undefined,
    });
  });

  it('setMainIncomeCategoryId writes the singleton row without one existing yet (TICKET-INC-19)', async () => {
    await repository.setMainIncomeCategoryId(4);

    expect(await repository.get()).toEqual({ id: 1, mainIncomeCategoryId: 4 });
  });

  it('setMainIncomeCategoryId preserves unrelated settings and stays a single row', async () => {
    await repository.setLocale('en-GB');
    await repository.setSmoothedBonusCategoryIds([2]);
    await repository.setMainIncomeCategoryId(4);
    await repository.setMainIncomeCategoryId(1);

    expect(await repository.get()).toEqual({
      id: 1,
      locale: 'en-GB',
      smoothedBonusCategoryIds: [2],
      mainIncomeCategoryId: 1,
    });
    expect(await appDb.appSettings.count()).toBe(1);
  });

  it('setMainIncomeCategoryId(undefined) clears it without touching the rest of the row', async () => {
    await repository.setPrimaryColor('rose');
    await repository.setMainIncomeCategoryId(4);

    await repository.setMainIncomeCategoryId(undefined);

    expect(await repository.get()).toEqual({
      id: 1,
      primaryColor: 'rose',
      mainIncomeCategoryId: undefined,
    });
  });

  it('setFiscalYearStartMonth writes the singleton row without one existing yet (TICKET-SET-09)', async () => {
    await repository.setFiscalYearStartMonth(4);

    expect(await repository.get()).toEqual({ id: 1, fiscalYearStartMonth: 4 });
  });

  it('setFiscalYearStartMonth preserves a locale and a currency symbol already on the row', async () => {
    await repository.setLocale('en-GB');
    await repository.setCurrencySymbol('£');

    await repository.setFiscalYearStartMonth(4);

    expect(await repository.get()).toEqual({
      id: 1,
      locale: 'en-GB',
      currencySymbol: '£',
      fiscalYearStartMonth: 4,
    });
    expect(await appDb.appSettings.count()).toBe(1);
  });

  it('setFiscalYearStartMonth(1) stores January explicitly rather than leaving the field unwritten', async () => {
    await repository.setFiscalYearStartMonth(4);

    await repository.setFiscalYearStartMonth(1);

    expect((await repository.get()).fiscalYearStartMonth).toBe(1);
  });
});
