import Papa from 'papaparse';
import type { CsvEncoding, DateFormat } from '@/core/data-access';

/**
 * Works out how a CSV file is written — the five settings the parser needs before any column can be
 * mapped — from the start of the file, with a confidence each (TICKET-IMP-16). Pure: the caller
 * decodes the bytes and says whether they were valid UTF-8; nothing here touches a `File`.
 *
 * It only ever proposes values the parser supports (`SUPPORTED_DATE_FORMATS`,
 * `SUPPORTED_ENCODINGS`), and "unsure" always comes with the safest default rather than no value,
 * so a caller can read the file straight away and ask about the unsure ones afterwards.
 */

export type GuessConfidence = 'sure' | 'unsure';

export type Guess<T> = { value: T; confidence: GuessConfidence };

/** The five settings that decide how a file is *read*, as opposed to which column means what. */
export type ReadingOptions = {
  encoding: CsvEncoding;
  delimiter: string;
  headerRows: number;
  dateFormat: DateFormat;
  decimalSeparator: string;
};

export type ReadingGuess = { [K in keyof ReadingOptions]: Guess<ReadingOptions[K]> };

export const READING_DELIMITERS = [';', ',', '\t'] as const;
export const READING_DECIMAL_SEPARATORS = [',', '.'] as const;

const DEFAULT_READING: ReadingOptions = {
  encoding: 'utf-8',
  delimiter: ';',
  headerRows: 1,
  dateFormat: 'DD/MM/YYYY',
  decimalSeparator: ',',
};

/** Enough lines to see past a preamble and get a fair vote on dates and amounts. */
const SAMPLE_LINES = 40;

const sure = <T>(value: T): Guess<T> => ({ value, confidence: 'sure' });
const unsure = <T>(value: T): Guess<T> => ({ value, confidence: 'unsure' });

const DATE_LIKE = /^\d{1,4}[/.-]\d{1,2}[/.-]\d{1,4}$/;
const ISO_DATE = /^\d{4}-\d{1,2}-\d{1,2}$/;
const SLASHED_DATE = /^(\d{1,2})\/(\d{1,2})\/\d{4}$/;
const CURRENCY_AROUND = /^[€$£]\s?|\s?(?:[€$£]|EUR|USD|GBP)$/g;
const AMOUNT_SHAPE = /^[-+]?\d[\d.,]*$/;

/** Any of the usual date spellings, supported by the parser or not — used to tell a header from data. */
export const looksLikeDate = (cell: string): boolean => DATE_LIKE.test(cell.trim());

/** The cell with any currency symbol or code around it taken off, when what is left is a number carrying a `.` or `,`. */
export const amountCore = (cell: string): string | null => {
  const core = cell.trim().replace(CURRENCY_AROUND, '');
  if (!AMOUNT_SHAPE.test(core) || !/[.,]/.test(core) || looksLikeDate(core)) return null;
  return core;
};

const sampleRows = (text: string, delimiter: string): string[][] =>
  Papa.parse<string[]>(text, {
    delimiter,
    header: false,
    skipEmptyLines: true,
    preview: SAMPLE_LINES,
  }).data;

type DelimiterFit = { delimiter: string; columns: number; lines: number };

/**
 * The longest unbroken run of lines sharing one column count (ignoring one-column lines), and that
 * count. A run rather than a tally, because the real separator splits the header and every data
 * line alike — one block — while a separator that only splits by accident (the comma in `-84,12`)
 * can match as many lines in total but is broken by the header it doesn't split (TICKET-IMP-16,
 * found live: a comma-laden preamble plus comma decimals tied the semicolon on a plain count).
 */
const longestRun = (rows: string[][]): { columns: number; lines: number } => {
  let best = { columns: 1, lines: 0 };
  let run = { columns: 1, lines: 0 };
  for (const row of rows) {
    run =
      row.length === run.columns
        ? { ...run, lines: run.lines + 1 }
        : { columns: row.length, lines: 1 };
    const longer =
      run.lines > best.lines || (run.lines === best.lines && run.columns > best.columns);
    if (run.columns > 1 && longer) best = run;
  }
  return best;
};

/** The separator that splits the longest block of lines into the same number of columns — so a
 * preamble line before the header, which defeated the old first-line guess, is simply outrun. */
const guessDelimiter = (text: string): { guess: Guess<string>; columns: number } => {
  const fits: DelimiterFit[] = READING_DELIMITERS.map((delimiter) => ({
    delimiter,
    ...longestRun(sampleRows(text, delimiter)),
  })).sort((a, b) => b.lines - a.lines || b.columns - a.columns);

  const [best, runnerUp] = fits;
  if (best.lines === 0) return { guess: unsure(DEFAULT_READING.delimiter), columns: 1 };
  const clear = best.lines >= 2 && runnerUp.lines < best.lines;
  return {
    guess: clear ? sure(best.delimiter) : unsure(best.delimiter),
    columns: best.columns,
  };
};

/** The first line with the data's column count and no date in it; sure when a dated line follows. */
const guessHeaderRows = (rows: string[][], columns: number): Guess<number> => {
  const hasDate = (row: string[] | undefined): boolean => !!row?.some(looksLikeDate);
  if (columns <= 1) return unsure(DEFAULT_READING.headerRows);

  const headerIndex = rows.findIndex((row) => row.length === columns && !hasDate(row));
  if (headerIndex !== -1) {
    const followedByData = hasDate(rows[headerIndex + 1]);
    return followedByData ? sure(headerIndex + 1) : unsure(headerIndex + 1);
  }

  // A header that is a column short of the data (a trailing separator on every data line, say):
  // fall back to the line just above the first dated one, and say so.
  const firstData = rows.findIndex((row) => row.length === columns && hasDate(row));
  if (firstData > 0 && rows[firstData - 1].length > 1) return unsure(firstData);
  return unsure(DEFAULT_READING.headerRows);
};

type DateTally = { iso: number; slashed: number; firstAbove12: boolean; secondAbove12: boolean };

/** How many ISO and slashed dates there are, and whether either slashed part ever passes 12. */
const tallyDates = (cells: string[]): DateTally => {
  const tally: DateTally = { iso: 0, slashed: 0, firstAbove12: false, secondAbove12: false };
  for (const cell of cells) {
    const value = cell.trim();
    if (ISO_DATE.test(value)) tally.iso++;
    const match = SLASHED_DATE.exec(value);
    if (!match) continue;
    tally.slashed++;
    tally.firstAbove12 ||= Number(match[1]) > 12;
    tally.secondAbove12 ||= Number(match[2]) > 12;
  }
  return tally;
};

/** An ISO date settles it; so does a day above 12. Dates that fit both orders leave it unsure. */
const guessDateFormat = (cells: string[]): Guess<DateFormat> => {
  const { iso, slashed, firstAbove12, secondAbove12 } = tallyDates(cells);
  if (iso > slashed) return slashed === 0 ? sure('YYYY-MM-DD') : unsure('YYYY-MM-DD');
  if (slashed > 0 && firstAbove12 && !secondAbove12) return sure('DD/MM/YYYY');
  if (slashed > 0 && secondAbove12 && !firstAbove12) return sure('MM/DD/YYYY');
  return unsure(DEFAULT_READING.dateFormat);
};

/** Which mark one amount-shaped value says is the decimal one, or `null` when it can't tell. */
const decimalVote = (core: string): ',' | '.' | null => {
  const lastComma = core.lastIndexOf(',');
  const lastDot = core.lastIndexOf('.');
  // Two different marks: the last one is the decimal mark (1.234,56 / 1,234.56).
  if (lastComma !== -1 && lastDot !== -1) return lastComma > lastDot ? ',' : '.';

  const mark = lastComma !== -1 ? ',' : '.';
  const other = mark === ',' ? '.' : ',';
  // The same mark more than once can only be grouping thousands (1.234.567).
  if (core.split(mark).length > 2) return other;
  const digitsAfter = core.length - core.indexOf(mark) - 1;
  // Exactly three digits after it is either a thousands group or three decimals — no vote.
  if (digitsAfter === 0 || digitsAfter === 3) return null;
  return mark;
};

const guessDecimalSeparator = (cells: string[]): Guess<string> => {
  const votes = { ',': 0, '.': 0 };
  for (const cell of cells) {
    const core = amountCore(cell);
    const vote = core === null ? null : decimalVote(core);
    if (vote) votes[vote]++;
  }
  if (votes[','] === votes['.']) return unsure(DEFAULT_READING.decimalSeparator);
  const [winner, loser] = votes[','] > votes['.'] ? ([',', '.'] as const) : (['.', ','] as const);
  return votes[loser] === 0 ? sure(winner) : unsure(winner);
};

/** What a lenient decode puts in place of a byte it could not read. Built via fromCharCode so the
 * source holds no invisible character (the same reason `csv-parse.ts` builds its NO_QUOTE_CHAR). */
export const REPLACEMENT_CHAR = String.fromCharCode(0xfffd);

/** Any character outside ASCII — an accented letter, or a decode's replacement character. */
// eslint-disable-next-line no-control-regex -- "anything outside ASCII" is exactly what is meant
export const NON_ASCII = /[^\x00-\x7F]/;

/** Valid UTF-8 is UTF-8. Anything else is read as Windows-1252 — unless the text also holds
 * well-formed UTF-8 letters, which means the file mixes both and the user has to look. */
const guessEncoding = (text: string, utf8Valid: boolean): Guess<CsvEncoding> => {
  if (utf8Valid) return sure('utf-8');
  const mixed = [...text].some((char) => char !== REPLACEMENT_CHAR && NON_ASCII.test(char));
  return mixed ? unsure('windows-1252') : sure('windows-1252');
};

/** `text` is the start of the file decoded as UTF-8 (lenient); `utf8Valid` says whether that decode
 * met any malformed byte. Every structural mark the guess looks at is ASCII, so the lenient decode
 * is good enough to read structure from even when the file turns out to be Windows-1252. */
export const guessReadingOptions = (text: string, utf8Valid: boolean): ReadingGuess => {
  if (text.trim() === '') {
    return {
      encoding: unsure(DEFAULT_READING.encoding),
      delimiter: unsure(DEFAULT_READING.delimiter),
      headerRows: unsure(DEFAULT_READING.headerRows),
      dateFormat: unsure(DEFAULT_READING.dateFormat),
      decimalSeparator: unsure(DEFAULT_READING.decimalSeparator),
    };
  }

  const { guess: delimiter, columns } = guessDelimiter(text);
  const rows = sampleRows(text, delimiter.value);
  const headerRows = guessHeaderRows(rows, columns);
  const dataCells = rows.slice(headerRows.value).flat();

  return {
    encoding: guessEncoding(text, utf8Valid),
    delimiter,
    headerRows,
    dateFormat: guessDateFormat(dataCells),
    decimalSeparator: guessDecimalSeparator(dataCells),
  };
};
