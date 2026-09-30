import { TestBed } from '@angular/core/testing';
import { callApi, withApiTesting } from './api-client.testing';
import { AppSettingsRepository } from './app-settings.repository';
import { DEFAULT_APP_SETTINGS } from './seed-data';

const PATH = '/api/settings/appSettings';

type Setter = (repository: AppSettingsRepository) => Promise<number>;

/** Each of the fourteen setters, and the one-field body it is documented to send. */
const SETTERS: readonly [string, Setter, unknown][] = [
  ['PrimaryColor', (r) => r.setPrimaryColor('sky'), { primaryColor: 'sky' }],
  ['CurrencySymbol', (r) => r.setCurrencySymbol('$'), { currencySymbol: '$' }],
  [
    'CurrencySymbolPosition',
    (r) => r.setCurrencySymbolPosition('after'),
    { currencySymbolPosition: 'after' },
  ],
  ['Locale', (r) => r.setLocale('en-BE'), { locale: 'en-BE' }],
  [
    'ExcludedIncomeCategoryIds',
    (r) => r.setExcludedIncomeCategoryIds([1]),
    { excludedIncomeCategoryIds: [1] },
  ],
  [
    'HeatmapExcludedCategoryIds',
    (r) => r.setHeatmapExcludedCategoryIds([2]),
    { heatmapExcludedCategoryIds: [2] },
  ],
  ['CareerStartDate', (r) => r.setCareerStartDate('2020-01-01'), { careerStartDate: '2020-01-01' }],
  [
    'SmoothedBonusCategoryIds',
    (r) => r.setSmoothedBonusCategoryIds([3]),
    { smoothedBonusCategoryIds: [3] },
  ],
  ['GrossColor', (r) => r.setGrossColor('rose'), { grossColor: 'rose' }],
  ['MainIncomeCategoryId', (r) => r.setMainIncomeCategoryId(4), { mainIncomeCategoryId: 4 }],
  ['PrivacyMode', (r) => r.setPrivacyMode(true), { privacyMode: true }],
  ['FiscalYearStartMonth', (r) => r.setFiscalYearStartMonth(4), { fiscalYearStartMonth: 4 }],
  [
    'RecentRanges',
    (r) => r.setRecentRanges([{ fromExpr: 'start-of-month', toExpr: 'today' }]),
    { recentRanges: [{ fromExpr: 'start-of-month', toExpr: 'today' }] },
  ],
];

/** The four whose parameter accepts `undefined`, which means "clear this field". */
const CLEARERS: readonly [string, Setter, string][] = [
  ['PrimaryColor', (r) => r.setPrimaryColor(undefined), 'primaryColor'],
  ['GrossColor', (r) => r.setGrossColor(undefined), 'grossColor'],
  ['CareerStartDate', (r) => r.setCareerStartDate(undefined), 'careerStartDate'],
  ['MainIncomeCategoryId', (r) => r.setMainIncomeCategoryId(undefined), 'mainIncomeCategoryId'],
];

describe('AppSettingsRepository', () => {
  withApiTesting();

  const repository = (): AppSettingsRepository => TestBed.inject(AppSettingsRepository);

  it('get falls back to the defaults before anything is written', async () => {
    expect(await callApi(() => repository().get(), { method: 'GET', url: PATH }, {})).toEqual(
      DEFAULT_APP_SETTINGS,
    );
  });

  /**
   * The stored row is layered **over** the defaults rather than returned as it stands — a change
   * from the pre-TICKET-SRV-05 fallback, and a deliberate one: `AppSettingsStore` derives its signal members
   * from the seed object's keys, so a body missing a key would produce a store missing a member
   * (the `withState`-needs-every-key gotcha from v2.2).
   */
  it('get layers the stored row over the defaults, keeping every key', async () => {
    const settings = await callApi(
      () => repository().get(),
      { method: 'GET', url: PATH },
      { locale: 'en-BE' },
    );

    expect(settings).toEqual({ ...DEFAULT_APP_SETTINGS, locale: 'en-BE' });
    expect(Object.keys(settings).sort()).toEqual(Object.keys(DEFAULT_APP_SETTINGS).sort());
  });

  it.each(SETTERS)('set%s patches that one field', async (_name, call, body) => {
    expect(
      await callApi(
        () => call(repository()),
        { method: 'PATCH', url: PATH, body },
        DEFAULT_APP_SETTINGS,
      ),
    ).toBe(1);
  });

  // `JSON.stringify` drops an `undefined` value, which would turn a clear into a patch naming no
  // field at all — so `ApiClient` puts it on the wire as `null`, which is what the old `update`
  // meant by deleting the property.
  it.each(CLEARERS)('set%s clears the field by sending null', async (_name, call, field) => {
    expect(
      await callApi(
        () => call(repository()),
        { method: 'PATCH', url: PATH, body: { [field]: null } },
        DEFAULT_APP_SETTINGS,
      ),
    ).toBe(1);
  });
});
