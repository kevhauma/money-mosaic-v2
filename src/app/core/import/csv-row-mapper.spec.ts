import { findMissingMappedColumns, mapRow, type RowMapOptions } from './csv-row-mapper';
import type { MappingProfileColumns } from '@/core/data-access';

const amountMapping: MappingProfileColumns = {
  date: 'Boekingsdatum',
  amount: 'Bedrag',
  description: 'Omschrijving',
  counterpartyName: 'Naam tegenpartij',
  counterpartyIban: 'Rekeningnummer tegenpartij',
};

const debitCreditMapping: MappingProfileColumns = {
  date: 'Date',
  debit: 'Debit',
  credit: 'Credit',
  description: 'Description',
};

const baseOpts: RowMapOptions = {
  decimalSeparator: ',',
  dateFormat: 'DD/MM/YYYY',
  signConvention: 'as-is',
};

describe('mapRow: single amount column', () => {
  it('maps a valid row', () => {
    const result = mapRow(
      {
        Boekingsdatum: '01/07/2026',
        Bedrag: '-12,34',
        Omschrijving: 'Carrefour Market',
        'Naam tegenpartij': 'Carrefour',
        'Rekeningnummer tegenpartij': 'BE68539007547034',
      },
      amountMapping,
      baseOpts,
      0,
    );
    expect(result.valid).toBe(true);
    if (result.valid) {
      expect(result.transaction).toEqual({
        bookingDate: '2026-07-01',
        amount: -12.34,
        currency: 'EUR',
        rawDescription: 'Carrefour Market',
        counterpartyName: 'Carrefour',
        counterpartyIban: 'BE68539007547034',
      });
    }
  });

  it('parses comma decimal separator', () => {
    const result = mapRow(
      { Boekingsdatum: '01/07/2026', Bedrag: '12,34', Omschrijving: 'x' },
      amountMapping,
      baseOpts,
      0,
    );
    expect(result.valid).toBe(true);
    if (result.valid) expect(result.transaction.amount).toBe(12.34);
  });

  it('flags an unparseable date as invalid', () => {
    const result = mapRow(
      { Boekingsdatum: 'not-a-date', Bedrag: '12,34', Omschrijving: 'x' },
      amountMapping,
      baseOpts,
      1,
    );
    expect(result.valid).toBe(false);
    if (!result.valid) expect(result.errors).toContain('unparseable date');
  });

  it('flags an unparseable amount as invalid', () => {
    const result = mapRow(
      { Boekingsdatum: '01/07/2026', Bedrag: 'oops', Omschrijving: 'x' },
      amountMapping,
      baseOpts,
      2,
    );
    expect(result.valid).toBe(false);
    if (!result.valid) expect(result.errors).toContain('unparseable or ambiguous amount');
  });

  it('flags a missing description as invalid', () => {
    const result = mapRow(
      { Boekingsdatum: '01/07/2026', Bedrag: '12,34', Omschrijving: '' },
      amountMapping,
      baseOpts,
      3,
    );
    expect(result.valid).toBe(false);
    if (!result.valid) expect(result.errors).toContain('missing description');
  });

  it('preserves the raw row and reports every error on a malformed row rather than dropping it', () => {
    const result = mapRow(
      { Boekingsdatum: 'bad', Bedrag: 'bad', Omschrijving: '' },
      amountMapping,
      baseOpts,
      4,
    );
    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.rawRow).toEqual({ Boekingsdatum: 'bad', Bedrag: 'bad', Omschrijving: '' });
      expect(result.errors.length).toBe(3);
    }
  });

  it('leaves optional counterparty fields undefined when absent from the mapping', () => {
    const result = mapRow(
      { Boekingsdatum: '01/07/2026', Bedrag: '12,34', Omschrijving: 'x' },
      { date: 'Boekingsdatum', amount: 'Bedrag', description: 'Omschrijving' },
      baseOpts,
      5,
    );
    expect(result.valid).toBe(true);
    if (result.valid) {
      expect(result.transaction.counterpartyName).toBeUndefined();
      expect(result.transaction.counterpartyIban).toBeUndefined();
    }
  });
});

describe('mapRow: counterpartyIban fallback to description (TICKET-IMP-05)', () => {
  it('extracts an IBAN from the description when the mapped column is blank', () => {
    const result = mapRow(
      {
        Boekingsdatum: '01/07/2026',
        Bedrag: '500,00',
        Omschrijving: 'AUTOMATISCH SPAREN   01-07 VAN BE55 7310 2888 3844',
        'Rekeningnummer tegenpartij': '',
      },
      amountMapping,
      baseOpts,
      0,
    );
    expect(result.valid).toBe(true);
    if (result.valid) expect(result.transaction.counterpartyIban).toBe('BE55 7310 2888 3844');
  });

  it('matches the NAAR (outgoing) shape too', () => {
    const result = mapRow(
      {
        Boekingsdatum: '01/07/2026',
        Bedrag: '-500,00',
        Omschrijving: 'AUTOMATISCH SPAREN   01-07 NAAR BE92 7430 9521 6123',
      },
      amountMapping,
      baseOpts,
      0,
    );
    expect(result.valid).toBe(true);
    if (result.valid) expect(result.transaction.counterpartyIban).toBe('BE92 7430 9521 6123');
  });

  it('does not override a populated mapped column with a description-derived guess', () => {
    const result = mapRow(
      {
        Boekingsdatum: '01/07/2026',
        Bedrag: '500,00',
        Omschrijving: 'AUTOMATISCH SPAREN   01-07 VAN BE55 7310 2888 3844',
        'Rekeningnummer tegenpartij': 'BE68539007547034',
      },
      amountMapping,
      baseOpts,
      0,
    );
    expect(result.valid).toBe(true);
    if (result.valid) expect(result.transaction.counterpartyIban).toBe('BE68539007547034');
  });

  it('leaves counterpartyIban undefined when the description has no IBAN-shaped text', () => {
    const result = mapRow(
      {
        Boekingsdatum: '01/07/2026',
        Bedrag: '-12,34',
        Omschrijving: 'Carrefour Market',
        'Rekeningnummer tegenpartij': '',
      },
      amountMapping,
      baseOpts,
      0,
    );
    expect(result.valid).toBe(true);
    if (result.valid) expect(result.transaction.counterpartyIban).toBeUndefined();
  });

  it('falls back to the description when counterpartyIban is not mapped at all', () => {
    const result = mapRow(
      {
        Boekingsdatum: '01/07/2026',
        Bedrag: '500,00',
        Omschrijving: 'AUTOMATISCH SPAREN   01-07 VAN BE55 7310 2888 3844',
      },
      { date: 'Boekingsdatum', amount: 'Bedrag', description: 'Omschrijving' },
      baseOpts,
      0,
    );
    expect(result.valid).toBe(true);
    if (result.valid) expect(result.transaction.counterpartyIban).toBe('BE55 7310 2888 3844');
  });
});

describe('mapRow: date format dispatch', () => {
  it.each([
    ['YYYY-MM-DD', '2026-07-01', '2026-07-01'],
    ['DD/MM/YYYY', '01/07/2026', '2026-07-01'],
    ['MM/DD/YYYY', '07/01/2026', '2026-07-01'],
  ] as const)('parses %s via the lookup dispatch', (dateFormat, raw, expected) => {
    const result = mapRow(
      { Boekingsdatum: raw, Bedrag: '12,34', Omschrijving: 'x' },
      amountMapping,
      { ...baseOpts, dateFormat },
      0,
    );
    expect(result.valid).toBe(true);
    if (result.valid) expect(result.transaction.bookingDate).toBe(expected);
  });

  it('safely rejects a date format outside the union instead of throwing (e.g. a stored profile predating validation)', () => {
    const result = mapRow(
      { Boekingsdatum: '2026-07-01', Bedrag: '12,34', Omschrijving: 'x' },
      amountMapping,
      { ...baseOpts, dateFormat: 'DD.MM.YYYY' as RowMapOptions['dateFormat'] },
      0,
    );
    expect(result.valid).toBe(false);
    if (!result.valid) expect(result.errors).toContain('unparseable date');
  });
});

describe('mapRow: debit/credit columns', () => {
  it('maps a debit-filled row to a negative amount by default', () => {
    const result = mapRow(
      { Date: '2026-07-01', Debit: '50.00', Credit: '', Description: 'Rent' },
      debitCreditMapping,
      {
        ...baseOpts,
        dateFormat: 'YYYY-MM-DD',
        decimalSeparator: '.',
        signConvention: 'debit-negative',
      },
      0,
    );
    expect(result.valid).toBe(true);
    if (result.valid) expect(result.transaction.amount).toBe(-50);
  });

  it('maps a credit-filled row to a positive amount by default', () => {
    const result = mapRow(
      { Date: '2026-07-01', Debit: '', Credit: '100.00', Description: 'Salary' },
      debitCreditMapping,
      {
        ...baseOpts,
        dateFormat: 'YYYY-MM-DD',
        decimalSeparator: '.',
        signConvention: 'debit-negative',
      },
      0,
    );
    expect(result.valid).toBe(true);
    if (result.valid) expect(result.transaction.amount).toBe(100);
  });

  it('flips the sign when signConvention is credit-negative', () => {
    const result = mapRow(
      { Date: '2026-07-01', Debit: '50.00', Credit: '', Description: 'Rent' },
      debitCreditMapping,
      {
        ...baseOpts,
        dateFormat: 'YYYY-MM-DD',
        decimalSeparator: '.',
        signConvention: 'credit-negative',
      },
      0,
    );
    expect(result.valid).toBe(true);
    if (result.valid) expect(result.transaction.amount).toBe(50);
  });

  it('is invalid when both debit and credit are filled', () => {
    const result = mapRow(
      { Date: '2026-07-01', Debit: '50.00', Credit: '10.00', Description: 'x' },
      debitCreditMapping,
      { ...baseOpts, dateFormat: 'YYYY-MM-DD', decimalSeparator: '.' },
      0,
    );
    expect(result.valid).toBe(false);
  });

  it('is invalid when neither debit nor credit is filled', () => {
    const result = mapRow(
      { Date: '2026-07-01', Debit: '', Credit: '', Description: 'x' },
      debitCreditMapping,
      { ...baseOpts, dateFormat: 'YYYY-MM-DD', decimalSeparator: '.' },
      0,
    );
    expect(result.valid).toBe(false);
  });
});

describe('findMissingMappedColumns', () => {
  // amountMapping references 5 columns: date, amount, description, counterpartyName, counterpartyIban.
  const fullHeader = [
    'Boekingsdatum',
    'Bedrag',
    'Omschrijving',
    'Naam tegenpartij',
    'Rekeningnummer tegenpartij',
  ];

  it('returns no missing columns when every mapped column is present in the header', () => {
    const missing = findMissingMappedColumns(fullHeader, amountMapping);
    expect(missing).toEqual([]);
  });

  it('reports a single missing mapped column', () => {
    const missing = findMissingMappedColumns(
      fullHeader.filter((column) => column !== 'Bedrag'),
      amountMapping,
    );
    expect(missing).toEqual(['Bedrag']);
  });

  it('reports every missing mapped column', () => {
    const missing = findMissingMappedColumns(['SomeOtherColumn'], amountMapping);
    expect(missing).toEqual(
      expect.arrayContaining([
        'Boekingsdatum',
        'Bedrag',
        'Omschrijving',
        'Naam tegenpartij',
        'Rekeningnummer tegenpartij',
      ]),
    );
    expect(missing).toHaveLength(5);
  });

  it('ignores optional columns that were never mapped', () => {
    const missing = findMissingMappedColumns(['Boekingsdatum', 'Bedrag', 'Omschrijving'], {
      date: 'Boekingsdatum',
      amount: 'Bedrag',
      description: 'Omschrijving',
    });
    expect(missing).toEqual([]);
  });
});
