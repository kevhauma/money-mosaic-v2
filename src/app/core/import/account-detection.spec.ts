import type { Account, MappingProfile } from '@/core/data-access';
import { detectOwnIban, matchAccountByIban } from './account-detection';

const KBC_PROFILE: MappingProfile = {
  name: 'KBC',
  bankPreset: 'kbc',
  columns: {
    date: 'Boekingsdatum',
    description: 'Omschrijving',
    ownIban: 'Rekeningnummer',
  },
  delimiter: ';',
  decimalSeparator: ',',
  dateFormat: 'DD/MM/YYYY',
  encoding: 'windows-1252',
  headerRows: 1,
  signConvention: 'as-is',
};

describe('detectOwnIban: own account IBAN extraction', () => {
  it('reads the value from the matched column on the first data row', () => {
    const header = ['Rekeningnummer', 'Boekingsdatum', 'Omschrijving'];
    const dataRows = [['BE68539007547034', '01/07/2026', 'Carrefour']];
    expect(detectOwnIban(header, dataRows, KBC_PROFILE)).toBe('BE68539007547034');
  });

  it('matches the header case-insensitively and ignoring surrounding whitespace', () => {
    const header = [' rekeningnummer ', 'Boekingsdatum', 'Omschrijving'];
    const dataRows = [['BE68539007547034', '01/07/2026', 'Carrefour']];
    expect(detectOwnIban(header, dataRows, KBC_PROFILE)).toBe('BE68539007547034');
  });

  it('skips blank rows and returns the first non-empty value', () => {
    const header = ['Rekeningnummer', 'Boekingsdatum', 'Omschrijving'];
    const dataRows = [
      ['', '01/07/2026', 'Carrefour'],
      ['BE68539007547034', '02/07/2026', 'Colruyt'],
    ];
    expect(detectOwnIban(header, dataRows, KBC_PROFILE)).toBe('BE68539007547034');
  });

  it('returns null when the profile has no ownIban column mapped', () => {
    const header = ['Rekeningnummer', 'Boekingsdatum', 'Omschrijving'];
    const dataRows = [['BE68539007547034', '01/07/2026', 'Carrefour']];
    const profile: MappingProfile = {
      ...KBC_PROFILE,
      columns: { ...KBC_PROFILE.columns, ownIban: undefined },
    };
    expect(detectOwnIban(header, dataRows, profile)).toBeNull();
  });

  it('returns null when the mapped header is not present in this file', () => {
    const header = ['Account', 'Date', 'Description'];
    const dataRows = [['BE68539007547034', '01/07/2026', 'Carrefour']];
    expect(detectOwnIban(header, dataRows, KBC_PROFILE)).toBeNull();
  });
});

describe('matchAccountByIban: account lookup', () => {
  const accounts: Account[] = [
    {
      id: 1,
      name: 'Checking',
      type: 'checking',
      iban: 'BE68 5390 0754 7034',
      currency: 'EUR',
      openingBalance: 0,
      openingBalanceDate: '2026-01-01',
      color: '#000',
      icon: 'wallet',
      archived: false,
    },
    {
      id: 2,
      name: 'Savings',
      type: 'savings',
      currency: 'EUR',
      openingBalance: 0,
      openingBalanceDate: '2026-01-01',
      color: '#000',
      icon: 'wallet',
      archived: false,
    },
  ];

  it('matches ignoring spaces and case', () => {
    expect(matchAccountByIban('be68539007547034', accounts)?.id).toBe(1);
  });

  it('returns undefined when no account has a matching iban', () => {
    expect(matchAccountByIban('BE00000000000000', accounts)).toBeUndefined();
  });

  it('returns undefined for a null iban', () => {
    expect(matchAccountByIban(null, accounts)).toBeUndefined();
  });

  it('ignores accounts without an iban set', () => {
    expect(matchAccountByIban('', accounts)).toBeUndefined();
  });
});
