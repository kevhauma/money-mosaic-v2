import { parseCsvText } from './csv-parse';
import type { CsvParseRequest } from './csv-worker.types';

const baseRequest = (fileText: string): CsvParseRequest => ({
  fileText,
  delimiter: ';',
  headerRows: 1,
  mapping: { date: 'Date', description: 'Desc', amount: 'Amount' },
  decimalSeparator: ',',
  dateFormat: 'YYYY-MM-DD',
  signConvention: 'as-is',
});

const validRows = (response: ReturnType<typeof parseCsvText>) => {
  if ('error' in response) throw new Error(`unexpected parse error: ${response.error}`);
  if ('headerMismatch' in response) {
    throw new Error(`unexpected header mismatch: ${response.missingColumns.join(', ')}`);
  }
  return { rows: response.rows.filter((row) => row.valid), warnings: response.warnings };
};

describe('parseCsvText', () => {
  it('parses a clean, well-formed file via the default path with no warnings', () => {
    const file = [
      'Date;Desc;Amount',
      '2025-12-31;groceries;-10,00',
      '2025-06-11;rent;-625,00',
      '2025-06-10;shop;-17,35',
      '2025-01-01;salary;2000,00',
    ].join('\n');

    const { rows, warnings } = validRows(parseCsvText(baseRequest(file)));

    expect(rows).toHaveLength(4);
    expect(warnings).toEqual([]);
  });

  it('recovers rows swallowed by a stray opening quote and reports a warning', () => {
    // KBC-style: the description field starts with a literal `"` whose closing `"` is followed by a
    // space, not the delimiter. Default RFC parsing swallows every subsequent (older) line into that
    // one field. Newest-first ordering means the older rows vanish — mirroring the real bug report.
    const file = [
      'Date;Desc;Amount',
      '2025-12-31;groceries;-10,00',
      '2025-06-11;"HUUR" STUDIO 2A;-625,00',
      '2025-06-10;shop;-17,35',
      '2025-01-01;salary;2000,00',
    ].join('\n');

    const { rows, warnings } = validRows(parseCsvText(baseRequest(file)));

    expect(rows).toHaveLength(4);
    expect(warnings.length).toBeGreaterThan(0);
    // The two rows below the swallowing line survive with their real dates intact.
    const dates = rows.map((row) => (row.valid ? row.transaction.bookingDate : '')).sort();
    expect(dates).toEqual(['2025-01-01', '2025-06-10', '2025-06-11', '2025-12-31']);
  });

  it('does not adopt the lenient fallback for legitimately quoted fields', () => {
    // Here the quotes are real RFC field-quoting: they wrap a value containing the `;` delimiter.
    // The default parse is clean, so the fallback must stay off and the delimiter stays inside.
    const file = [
      'Date;Desc;Amount',
      '2025-12-31;"pay; day";-10,00',
      '2025-01-01;salary;2000,00',
    ].join('\n');

    const { rows, warnings } = validRows(parseCsvText(baseRequest(file)));

    expect(rows).toHaveLength(2);
    expect(warnings).toEqual([]);
    const descriptions = rows.map((row) => (row.valid ? row.transaction.rawDescription : ''));
    expect(descriptions).toContain('pay; day');
  });
});

describe('parseCsvText: original CSV row capture (TICKET-TXN-06)', () => {
  it('captures each row original physical line as rawLine on the mapped transaction', () => {
    const file = [
      'Date;Desc;Amount',
      '2025-12-31;groceries;-10,00',
      '2025-06-11;rent;-625,00',
    ].join('\n');

    const { rows } = validRows(parseCsvText(baseRequest(file)));

    expect(rows.map((row) => (row.valid ? row.transaction.rawLine : undefined))).toEqual([
      '2025-12-31;groceries;-10,00',
      '2025-06-11;rent;-625,00',
    ]);
  });

  it('captures each row as a header→value rawRow, in column order', () => {
    const file = ['Date;Desc;Amount', '2025-12-31;groceries;-10,00'].join('\n');

    const { rows } = validRows(parseCsvText(baseRequest(file)));

    expect(rows[0].valid && rows[0].transaction.rawRow).toEqual({
      Date: '2025-12-31',
      Desc: 'groceries',
      Amount: '-10,00',
    });
  });
});

describe('parseCsvText: header/mapping mismatch (TICKET-IMP-03)', () => {
  it('reports no mismatch when the mapping matches the file header', () => {
    const file = ['Date;Desc;Amount', '2025-12-31;groceries;-10,00'].join('\n');
    const response = parseCsvText(baseRequest(file));
    expect('headerMismatch' in response).toBe(false);
  });

  it('flags a mapped column missing from the header instead of mapping every row wrong', () => {
    // The mapping expects "Amount", but this file's amount column is named "Bedrag".
    const file = ['Date;Desc;Bedrag', '2025-12-31;groceries;-10,00'].join('\n');
    const response = parseCsvText(baseRequest(file));
    expect('headerMismatch' in response && response.headerMismatch).toBe(true);
    if ('headerMismatch' in response) {
      expect(response.missingColumns).toEqual(['Amount']);
    }
  });

  it('flags a mismatch when the wrong delimiter collapses the header row', () => {
    // The request expects ';' but this file is comma-delimited, so the header parses as one field.
    const file = ['Date,Desc,Amount', '2025-12-31,groceries,-10,00'].join('\n');
    const response = parseCsvText(baseRequest(file));
    expect('headerMismatch' in response && response.headerMismatch).toBe(true);
    if ('headerMismatch' in response) {
      expect(response.missingColumns).toEqual(expect.arrayContaining(['Date', 'Desc', 'Amount']));
    }
  });

  it('does not let a mismatch on one file affect an independent parse of another', () => {
    const mismatched = ['Date;Desc;Bedrag', '2025-12-31;groceries;-10,00'].join('\n');
    const clean = ['Date;Desc;Amount', '2025-12-31;groceries;-10,00'].join('\n');

    const mismatchedResponse = parseCsvText(baseRequest(mismatched));
    const cleanResponse = parseCsvText(baseRequest(clean));

    expect('headerMismatch' in mismatchedResponse).toBe(true);
    expect('headerMismatch' in cleanResponse).toBe(false);
  });
});
