import { describe, expect, it } from 'vitest';
import { guessColumns } from '@/core/import';
import {
  columnGroups,
  columnsSummary,
  mappingNameFor,
  missingColumns,
  type ColumnStatementsInput,
} from './column-statements';

const HEADERS = ['Datum', 'Omschrijving', 'Mededeling', 'Bedrag', 'Rekening'];
const ROWS = [
  ['30/09/2026', 'Betaling', 'BETALING MET KAART COLRUYT GENT', '-84,12', 'BE12 3456 7890 1234'],
  ['01/10/2026', 'Loon', 'OVERSCHRIJVING LOON SEPTEMBER', '3.120,00', 'BE12 3456 7890 1234'],
];
const READING = { dateFormat: 'DD/MM/YYYY' as const, decimalSeparator: ',' };

const input = (overrides: Partial<ColumnStatementsInput> = {}): ColumnStatementsInput => {
  const guess = guessColumns(HEADERS, ROWS, READING);
  const value = Object.fromEntries(
    Object.entries(guess.fields).map(([key, field]) => [key, field.column ?? '']),
  );
  return {
    headers: HEADERS,
    rows: ROWS,
    value,
    guess,
    amountMode: guess.amountMode,
    reading: READING,
    signConvention: 'as-is',
    ...overrides,
  };
};

const rowsOf = (vmInput: ColumnStatementsInput) =>
  Object.fromEntries(
    columnGroups(vmInput)
      .flatMap((group) => group.rows)
      .map((row) => [row.key, row]),
  );

describe('columnGroups', () => {
  it('lists the needed fields, then the ones that make rules and transfers smarter', () => {
    const [needed, optional] = columnGroups(input());
    expect(needed.rows.map((row) => row.label)).toEqual(['Date', 'Amount', 'Description']);
    expect(optional.title).toBe('Also found');
    expect(optional.rows.map((row) => row.label)).toEqual([
      'Who it was with',
      'Their IBAN',
      'Your IBAN',
      'Running balance',
    ]);
    expect(optional.rows.find((row) => row.key === 'counterpartyIban')?.reason).toBe(
      'Finds transfers between your own accounts.',
    );
  });

  it('lists money out and money in in place of one amount for a split mapping', () => {
    const [needed] = columnGroups(input({ amountMode: 'split' }));
    expect(needed.rows.map((row) => row.label)).toEqual([
      'Date',
      'Money out',
      'Money in',
      'Description',
    ]);
  });

  it('reads the first line through the parser, under the current settings', () => {
    const rows = rowsOf(input());
    expect(rows['date'].reading).toMatch(/^30\/09\/2026 reads as 30 Sept? 2026$/);
    expect(rows['amount'].reading).toMatch(/^-84,12 reads as -€84[.,]12$/);
    expect(rows['ownIban'].reading).toBe('BE12 3456 7890 1234, the same on every line');

    const dotted = rowsOf(input({ reading: { ...READING, decimalSeparator: '.' } }));
    expect(dotted['amount'].reading).not.toBe(rows['amount'].reading);
  });

  it('says so when a value does not read as what the field needs', () => {
    const rows = rowsOf(input({ value: { ...input().value, date: 'Omschrijving' } }));
    expect(rows['date'].reading).toBe('Betaling doesn’t read as a date');
    expect(rows['date'].readingProblem).toBe(true);
  });

  it('signs a split pair the way the import will, swapped by a credit-negative mapping', () => {
    const value = { ...input().value, amount: '', debit: 'Bedrag', credit: 'Bedrag' };
    const asIs = rowsOf(input({ amountMode: 'split', value }));
    expect(asIs['debit'].reading).toMatch(/reads as -€84[.,]12$/);
    expect(asIs['credit'].reading).toMatch(/reads as \+€84[.,]12$/);

    const swapped = rowsOf(
      input({ amountMode: 'split', value, signConvention: 'credit-negative' }),
    );
    expect(swapped['debit'].reading).toMatch(/reads as \+€84[.,]12$/);
  });

  it('marks the guess sure or check-this, names a runner-up, and a field with no column not found', () => {
    const rows = rowsOf(input());
    expect(rows['date'].markerLabel).toBe('✓ sure');
    expect(rows['description'].marker).toBe('check');
    expect(rows['description'].markerLabel).toBe('check this');
    expect(rows['description'].runnerUp).toBe('or maybe: Omschrijving');
    expect(rows['balance'].markerLabel).toBe('not found');
    expect(rows['balance'].reading).toBe('');
  });

  it('marks a column the guess did not propose as set', () => {
    const rows = rowsOf(input({ value: { ...input().value, description: 'Omschrijving' } }));
    expect(rows['description'].marker).toBe('set');
    expect(rows['description'].runnerUp).toBeUndefined();
  });

  it('flags two fields on one column', () => {
    const rows = rowsOf(input({ value: { ...input().value, counterpartyName: 'Mededeling' } }));
    expect(rows['description'].clash).toBe('Also used for Who it was with');
    expect(rows['counterpartyName'].clash).toBe('Also used for Description');
  });
});

describe('missingColumns', () => {
  it('names the needed fields still without a column', () => {
    expect(missingColumns({ date: 'Datum' }, 'single')).toEqual(['Amount', 'Description']);
    expect(missingColumns({ date: 'D', description: 'O', debit: 'Af' }, 'split')).toEqual([
      'Money in',
    ]);
    expect(missingColumns({ date: 'D', amount: 'B', description: 'O' }, 'single')).toEqual([]);
  });
});

describe('columnsSummary', () => {
  it('names the needed columns and counts the rest', () => {
    expect(
      columnsSummary(
        { date: 'Datum', amount: 'Bedrag', description: 'Omschrijving', ownIban: 'R' },
        'single',
      ),
    ).toBe('Date ← Datum · Amount ← Bedrag · Description ← Omschrijving · 1 more');
    expect(columnsSummary({ date: 'Datum', description: 'O' }, 'single')).toBe(
      'Date ← Datum · Description ← O',
    );
  });
});

describe('mappingNameFor', () => {
  it('takes the file name without its extension', () => {
    expect(mappingNameFor('argenta-export.csv')).toBe('argenta-export');
    expect(mappingNameFor('.csv')).toBe('Custom mapping');
  });
});
