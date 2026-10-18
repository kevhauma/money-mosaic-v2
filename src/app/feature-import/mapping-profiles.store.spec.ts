import { TestBed } from '@angular/core/testing';
import { vi } from 'vitest';
import { MappingProfilesRepository, type MappingProfile } from '@/core/data-access';
import { matchTemplateForHeaders, MappingProfilesStore } from './mapping-profiles.store';

const KBC_TEMPLATE: MappingProfile = {
  name: 'KBC',
  bankPreset: 'kbc',
  headerSignature: [
    'Rekeningnummer',
    'Boekingsdatum',
    'Bedrag',
    'Munt',
    'Omschrijving',
    'Naam tegenpartij',
    'Rekeningnummer tegenpartij',
  ],
  columns: { date: 'Boekingsdatum', description: 'Omschrijving' },
  delimiter: ';',
  decimalSeparator: ',',
  dateFormat: 'DD/MM/YYYY',
  encoding: 'windows-1252',
  headerRows: 1,
  signConvention: 'as-is',
};

const BELFIUS_TEMPLATE: MappingProfile = {
  ...KBC_TEMPLATE,
  name: 'Belfius',
  bankPreset: 'belfius',
  headerSignature: [
    'Rekening',
    'Boekingsdatum',
    'Bedrag',
    'Munt',
    'Omschrijving',
    'Naam tegenpartij',
  ],
};

const TEMPLATES = [KBC_TEMPLATE, BELFIUS_TEMPLATE];

describe('matchTemplateForHeaders: bank template detection', () => {
  it('detects KBC from an exact header set', () => {
    expect(matchTemplateForHeaders(TEMPLATES, KBC_TEMPLATE.headerSignature!)?.bankPreset).toBe(
      'kbc',
    );
  });

  it('detects KBC when headers are reordered and mixed case', () => {
    const shuffled = [...KBC_TEMPLATE.headerSignature!]
      .reverse()
      .map((header) => header.toUpperCase());
    expect(matchTemplateForHeaders(TEMPLATES, shuffled)?.bankPreset).toBe('kbc');
  });

  it('detects Belfius from an exact header set', () => {
    expect(matchTemplateForHeaders(TEMPLATES, BELFIUS_TEMPLATE.headerSignature!)?.bankPreset).toBe(
      'belfius',
    );
  });

  it('returns undefined for unrelated/generic headers', () => {
    expect(matchTemplateForHeaders(TEMPLATES, ['Date', 'Amount', 'Description'])).toBeUndefined();
  });

  it('still matches when parsed headers are a superset of the signature', () => {
    const withExtraColumn = [...KBC_TEMPLATE.headerSignature!, 'Some Extra Column'];
    expect(matchTemplateForHeaders(TEMPLATES, withExtraColumn)?.bankPreset).toBe('kbc');
  });

  it('ignores saved profiles that have no header signature', () => {
    const savedProfile: MappingProfile = { ...KBC_TEMPLATE, headerSignature: undefined };
    expect(matchTemplateForHeaders([savedProfile], KBC_TEMPLATE.headerSignature!)).toBeUndefined();
  });
});

describe('MappingProfilesStore: on-injection hydration (TICKET-PERF-07)', () => {
  const mappingProfilesRepository = { getAll: vi.fn(), add: vi.fn(), update: vi.fn() };

  beforeEach(() => {
    vi.clearAllMocks();
    mappingProfilesRepository.getAll.mockResolvedValue([KBC_TEMPLATE]);
    TestBed.configureTestingModule({
      providers: [{ provide: MappingProfilesRepository, useValue: mappingProfilesRepository }],
    });
  });

  it('hydrates itself on first injection without a caller invoking hydrate()', async () => {
    const store = TestBed.inject(MappingProfilesStore);

    await store.hydrate();

    expect(mappingProfilesRepository.getAll).toHaveBeenCalledTimes(1);
    expect(store.profiles()).toEqual([KBC_TEMPLATE]);
  });

  it('is idempotent: double injection and repeated calls all resolve without re-fetching', async () => {
    const store = TestBed.inject(MappingProfilesStore);

    await Promise.all([store.hydrate(), store.hydrate()]);
    await store.hydrate();

    expect(mappingProfilesRepository.getAll).toHaveBeenCalledTimes(1);
  });

  it('detectTemplateForFile awaits the on-injection hydrate before matching', async () => {
    const store = TestBed.inject(MappingProfilesStore);
    const detectHeaders = vi.fn().mockResolvedValue(KBC_TEMPLATE.headerSignature);

    const matched = await store.detectTemplateForFile(detectHeaders);

    expect(matched?.bankPreset).toBe('kbc');
    expect(mappingProfilesRepository.getAll).toHaveBeenCalledTimes(1);
  });
});

describe('MappingProfilesStore: remembering a mapping (TICKET-IMP-17)', () => {
  const mappingProfilesRepository = { getAll: vi.fn(), add: vi.fn(), update: vi.fn() };

  /** What the Columns section saves for a file no preset knows: its whole header line + account. */
  const custom = (headers: string[], accountId = 1): MappingProfile => ({
    ...KBC_TEMPLATE,
    name: 'argenta-export',
    bankPreset: undefined,
    headerSignature: headers,
    defaultAccountId: accountId,
  });
  const ARGENTA = ['Datum', 'Mededeling', 'Bedrag', 'Rekening tegenpartij'];
  const OTHER = ['Date', 'Description', 'Amount'];

  const hydratedStore = async (profiles: MappingProfile[]) => {
    mappingProfilesRepository.getAll.mockResolvedValue(profiles);
    const store = TestBed.inject(MappingProfilesStore);
    await store.hydrate();
    return store;
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mappingProfilesRepository.add.mockResolvedValue(7);
    mappingProfilesRepository.update.mockResolvedValue(undefined);
    TestBed.configureTestingModule({
      providers: [{ provide: MappingProfilesRepository, useValue: mappingProfilesRepository }],
    });
  });

  it('recognises a later file with the same headers as the remembered mapping', async () => {
    const store = await hydratedStore(TEMPLATES);
    await store.upsertRemembered(custom(ARGENTA));

    const detected = await store.detectTemplateForFile(async () => [...ARGENTA]);

    expect(detected?.name).toBe('argenta-export');
    expect(store.findRemembered(detected!, 1)?.id).toBe(7);
  });

  it('keeps two custom file types of one account apart instead of overwriting the first', async () => {
    const store = await hydratedStore([{ ...custom(ARGENTA), id: 3 }]);

    await store.upsertRemembered(custom(OTHER));

    expect(mappingProfilesRepository.update).not.toHaveBeenCalled();
    expect(mappingProfilesRepository.add).toHaveBeenCalledTimes(1);
    expect(store.profiles()).toHaveLength(2);
  });

  it('updates the remembered row for the same headers, in any order or case', async () => {
    const store = await hydratedStore([{ ...custom(ARGENTA), id: 3 }]);

    await store.upsertRemembered(custom(ARGENTA.map((header) => header.toUpperCase()).reverse()));

    expect(mappingProfilesRepository.update).toHaveBeenCalledWith(3, expect.anything());
    expect(mappingProfilesRepository.add).not.toHaveBeenCalled();
  });

  it('finds this account’s mapping for a file type another account remembered first', async () => {
    const otherAccount = { ...custom(ARGENTA, 2), id: 4 };
    const thisAccount = { ...custom(ARGENTA, 1), id: 5 };
    const store = await hydratedStore([otherAccount, thisAccount]);

    expect(store.findRemembered(otherAccount, 1)?.id).toBe(5);
    expect(store.findRemembered(custom(OTHER, 2), 1)).toBeUndefined();
  });

  it('still keys a bank preset’s mapping on the bank', async () => {
    const store = await hydratedStore([{ ...KBC_TEMPLATE, id: 9, defaultAccountId: 1 }]);

    expect(store.findRemembered(KBC_TEMPLATE, 1)?.id).toBe(9);
    expect(store.findRemembered(BELFIUS_TEMPLATE, 1)).toBeUndefined();
  });
});
