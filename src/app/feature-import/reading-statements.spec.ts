import type { ReadingOptions } from '@/core/import';
import { withCleanFormatSettings } from '@/shared/utils/format-settings.testing';
import {
  RECOGNISED_CONFIDENCE,
  allSure,
  readingLines,
  readingNote,
  readingSource,
  readingStatements,
  readingSummary,
  type ReadingKey,
  type ReadingStatementVm,
  type ReadingStatementsInput,
} from './reading-statements';

const OPTIONS: ReadingOptions = {
  encoding: 'utf-8',
  delimiter: ';',
  headerRows: 1,
  dateFormat: 'DD/MM/YYYY',
  decimalSeparator: ',',
};

const ROWS = [
  ['Datum', 'Omschrijving', 'Bedrag'],
  ['30/09/2026', 'CAFÉ RÉSISTANCE', '-84,12'],
  ['01/09/2026', 'ACME NV', '3120,00'],
];
// What the same bytes look like read as Windows-1252.
const ROWS_AS_1252 = [
  ['Datum', 'Omschrijving', 'Bedrag'],
  ['30/09/2026', 'CAFÃ‰ RÃ‰SISTANCE', '-84,12'],
  ['01/09/2026', 'ACME NV', '3120,00'],
];

const input = (overrides: Partial<ReadingStatementsInput> = {}): ReadingStatementsInput => ({
  rows: ROWS,
  otherEncodingRows: ROWS_AS_1252,
  options: OPTIONS,
  confidence: RECOGNISED_CONFIDENCE,
  ...overrides,
});

const statement = (
  key: ReadingKey,
  overrides?: Partial<ReadingStatementsInput>,
): ReadingStatementVm =>
  readingStatements(input(overrides)).find((candidate) => candidate.key === key)!;

const previewOf = (row: ReadingStatementVm, value: string): string | undefined =>
  row.options.find((option) => option.value === value)?.preview;

describe('readingStatements: evidence from the file as read (TICKET-IMP-16)', () => {
  withCleanFormatSettings();

  it('lists the five settings in order', () => {
    expect(readingStatements(input()).map((row) => row.key)).toEqual([
      'delimiter',
      'headerRows',
      'dateFormat',
      'decimalSeparator',
      'encoding',
    ]);
  });

  it('counts the columns on every line', () => {
    const row = statement('delimiter');
    expect(row.title).toBe('Columns are split by ;');
    expect(row.evidence).toBe('3 columns on every line');
  });

  it('says when the separator leaves every line as one column', () => {
    const row = statement('delimiter', {
      rows: [['Datum;Omschrijving'], ['30/09/2026;x']],
      options: { ...OPTIONS, delimiter: ',' },
    });
    expect(row.title).toBe('Columns are split by ,');
    expect(row.evidence).toBe('Every line reads as one column');
  });

  it('names the header line and where data starts', () => {
    const row = statement('headerRows');
    expect(row.title).toBe('Line 1 is the header');
    expect(row.highlight).toBe('Datum · Omschrijving · Bedrag');
    expect(row.after).toBe('· data starts on line 2');
  });

  it('says a preamble above the header is skipped', () => {
    const row = statement('headerRows', {
      rows: [['Export of BE12'], ...ROWS],
      options: { ...OPTIONS, headerRows: 2 },
    });
    expect(row.title).toBe('Line 2 is the header');
    expect(row.after).toBe('· line 1 above it is skipped');
  });

  it('reads the most telling date with the current format, and previews the others', () => {
    const row = statement('dateFormat');
    // 30/09 can only be day/month, so it is picked over the ambiguous 01/09.
    expect(row.evidence).toBe('30/09/2026 reads as');
    expect(row.highlight).toMatch(/^30 Sept? 2026$/);
    expect(previewOf(row, 'MM/DD/YYYY')).toBe('not a date');
  });

  it('says when a date does not read under the chosen format', () => {
    const row = statement('dateFormat', { options: { ...OPTIONS, dateFormat: 'MM/DD/YYYY' } });
    expect(row.evidence).toBe('30/09/2026 does not read as a date this way');
    expect(row.highlight).toBeUndefined();
  });

  it('notes when every date fits both orders', () => {
    const row = statement('dateFormat', {
      rows: [ROWS[0], ['01/02/2026', 'x', '-1,00']],
    });
    expect(row.after).toBe('· every date so far fits both orders');
  });

  it('reads an amount with the current mark, and previews the other', () => {
    const row = statement('decimalSeparator');
    expect(row.title).toBe('A comma marks the decimals');
    expect(row.evidence).toBe('-84,12 reads as');
    expect(row.highlight).toBe('-€84,12');
    expect(previewOf(row, '.')).toBe('-€8.412,00');
  });

  it('updates the evidence when a setting changes', () => {
    const row = statement('decimalSeparator', {
      options: { ...OPTIONS, decimalSeparator: '.' },
    });
    expect(row.title).toBe('A dot marks the decimals');
    expect(row.highlight).toBe('-€8.412,00');
  });

  it('shows the first text the two encodings disagree on, as each reads it', () => {
    const row = statement('encoding');
    expect(row.title).toBe('Text is UTF-8');
    expect(row.evidence).toBe('Accented letters read as');
    expect(row.highlight).toBe('CAFÉ RÉSISTANCE');
    expect(previewOf(row, 'windows-1252')).toBe('CAFÃ‰ RÃ‰SISTANCE');
  });

  it('calls out broken letters under the wrong encoding', () => {
    const row = statement('encoding', {
      rows: ROWS_AS_1252,
      otherEncodingRows: ROWS,
      options: { ...OPTIONS, encoding: 'windows-1252' },
    });
    expect(row.evidence).toBe('Some letters look broken:');
    expect(row.highlight).toBe('CAFÃ‰ RÃ‰SISTANCE');
    expect(previewOf(row, 'utf-8')).toBe('CAFÉ RÉSISTANCE');
  });

  it('says so when the file has nothing to tell the encodings apart', () => {
    const plain = [ROWS[0], ['01/09/2026', 'ACME NV', '3120,00']];
    const row = statement('encoding', { rows: plain, otherEncodingRows: plain });
    expect(row.evidence).toBe('Plain letters only — both encodings read it the same');
  });

  it('carries each setting’s confidence and marks its current option', () => {
    const row = statement('dateFormat', {
      confidence: { ...RECOGNISED_CONFIDENCE, dateFormat: 'unsure' },
    });
    expect(row.confidence).toBe('unsure');
    expect(row.current).toBe('DD/MM/YYYY');
  });

  it('copes with an empty file', () => {
    const rows = readingStatements(input({ rows: [], otherEncodingRows: [] }));
    expect(rows.map((row) => row.evidence)).toEqual([
      'The file has no lines to read',
      'The file has no line 1',
      'No dates in the first lines',
      'No amounts with decimals in the first lines',
      'Plain letters only — both encodings read it the same',
    ]);
  });
});

describe('readingStatements: readingLines', () => {
  it('marks the preamble, the header and broken cells', () => {
    const lines = readingLines([['Export'], ...ROWS_AS_1252], 2);
    expect(lines.map((line) => line.role)).toEqual(['preamble', 'header', 'data', 'data']);
    expect(lines[2].cells.map((cell) => cell.broken)).toEqual([false, true, false]);
    expect(lines[2].cells[1]).toMatchObject({ color: 'warning', weight: 'bold' });
  });

  it('draws the header line bold, data in full ink and the preamble muted', () => {
    const [preamble, header, data] = readingLines([['Export'], ...ROWS], 2);
    expect(preamble.cells[0]).toMatchObject({ color: undefined, weight: undefined });
    expect(header.cells[0]).toMatchObject({ color: 'base-content', weight: 'semibold' });
    expect(data.cells[0]).toMatchObject({ color: 'base-content', weight: undefined });
  });

  it('shows four data lines under the header', () => {
    const rows = [ROWS[0], ...Array.from({ length: 10 }, () => ROWS[1])];
    expect(readingLines(rows, 1)).toHaveLength(5);
  });
});

describe('readingStatements: summary, note and source', () => {
  it('summarises the reading in one line', () => {
    expect(readingSummary({ ...OPTIONS, encoding: 'windows-1252' })).toBe(
      'Read as ; separated · comma decimals · day/month/year · Windows-1252',
    );
  });

  it('mentions the header line only when it is not the first', () => {
    expect(readingSummary({ ...OPTIONS, delimiter: '\t', headerRows: 3 })).toBe(
      'Read as tab separated · comma decimals · day/month/year · UTF-8 · header on line 3',
    );
  });

  it('says where a recognised reading came from, or how many things looked unsure', () => {
    expect(readingNote(RECOGNISED_CONFIDENCE, 'the KBC preset', false)).toBe('From the KBC preset');
    expect(readingNote(RECOGNISED_CONFIDENCE, null, false)).toBe('Guessed from the file');
    expect(readingNote({ ...RECOGNISED_CONFIDENCE, encoding: 'unsure' }, null, false)).toBe(
      'Checked by you',
    );
    expect(readingNote({ ...RECOGNISED_CONFIDENCE, encoding: 'unsure' }, null, true)).toBe(
      'Opened because one thing looked unsure.',
    );
    expect(
      readingNote(
        { ...RECOGNISED_CONFIDENCE, encoding: 'unsure', dateFormat: 'unsure' },
        null,
        true,
      ),
    ).toBe('Opened because 2 things looked unsure.');
  });

  it('names a saved mapping over a preset, and nothing for a guessed file', () => {
    expect(readingSource('KBC Checking', 'KBC')).toBe('your saved mapping "KBC Checking"');
    expect(readingSource(undefined, 'KBC')).toBe('the KBC preset');
    expect(readingSource(undefined, undefined)).toBeNull();
  });

  it('offers the header line as a number, matching its form control', () => {
    const row = statement('headerRows');
    expect(row.current).toBe(1);
    expect(row.options.map((option) => option.value)).toEqual([1, 2, 3]);
  });

  it('is all sure only when nothing is unsure', () => {
    expect(allSure(RECOGNISED_CONFIDENCE)).toBe(true);
    expect(allSure({ ...RECOGNISED_CONFIDENCE, headerRows: 'unsure' })).toBe(false);
  });
});
