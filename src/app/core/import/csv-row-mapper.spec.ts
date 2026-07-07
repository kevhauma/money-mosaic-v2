import { mapRow, type RowMapOptions } from './csv-row-mapper';
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
