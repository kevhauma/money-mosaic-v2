import { SUPPORTED_DATE_FORMATS, SUPPORTED_ENCODINGS, type DateFormat } from '@/core/data-access';
import type { FormControl } from '@angular/forms';
import type { TextColor, TextWeight } from '@/shared/ui';
import {
  NON_ASCII,
  READING_DECIMAL_SEPARATORS,
  REPLACEMENT_CHAR,
  READING_DELIMITERS,
  amountCore,
  looksLikeDate,
  parseAmount,
  parseDate,
  type GuessConfidence,
  type ReadingGuess,
  type ReadingOptions,
} from '@/core/import';
import { formatCurrency, formatDateSpelled } from '@/shared/utils';
import { DATE_FORMAT_LABELS, DELIMITER_LABELS, ENCODING_LABELS } from './column-mapping';

/**
 * The "How the file is read" section's view-model (TICKET-IMP-16): one plain statement per reading
 * setting, each with evidence taken from the file *as currently read*, so changing a setting
 * changes the evidence with it. Pure — the map step re-reads the lines and calls these again.
 */

export type ReadingKey = keyof ReadingOptions;

export type ReadingConfidence = Record<ReadingKey, GuessConfidence>;

/** The map step's form controls for the five settings, which the section's radios bind to. */
export type ReadingControls = { [K in ReadingKey]: FormControl<ReadingOptions[K]> };

/** A typed option value — the header line is a number, every other setting a string. */
export type ReadingValue = ReadingOptions[ReadingKey];

export type ReadingOptionVm = { value: ReadingValue; label: string; preview?: string };

export type ReadingStatementVm = {
  key: ReadingKey;
  title: string;
  /** Plain lead-in, then the part worth reading in bold, then a plain tail — any may be empty. */
  evidence: string;
  highlight?: string;
  after?: string;
  confidence: GuessConfidence;
  current: ReadingValue;
  options: ReadingOptionVm[];
};

/** One cell of the raw view, with how it is drawn resolved here rather than in the template. */
export type ReadingCellVm = {
  text: string;
  broken: boolean;
  /** `undefined` leaves `mm-text`'s muted caption ink — what a skipped preamble line reads in. */
  color: TextColor | undefined;
  weight: TextWeight | undefined;
};

export type ReadingLineVm = {
  number: number;
  role: 'preamble' | 'header' | 'data';
  cells: ReadingCellVm[];
};

export type ReadingStatementsInput = {
  /** The file's first lines, read with `options`. */
  rows: string[][];
  /** The same lines read with the *other* encoding — what the encoding options preview. */
  otherEncodingRows: string[][];
  options: ReadingOptions;
  confidence: ReadingConfidence;
};

/** How many data lines the raw view shows under the header. */
const DATA_LINES_SHOWN = 4;
/** How many lines the header-line option list offers. */
const HEADER_CHOICES = 8;

const DELIMITER_NAMES: Record<string, string> = { ';': ';', ',': ',', '\t': 'tabs' };
const DECIMAL_NAMES: Record<string, string> = { ',': 'comma', '.': 'dot' };

/** The `Ã©`-style pairs UTF-8 bytes turn into when read as Windows-1252: an `Ã`/`Â` followed by a
 * continuation byte's Windows-1252 reading (0x80–0xBF, or the Œ…™ block that 0x80–0x9F maps to). */
const MOJIBAKE = /[ÃÂ][\x80-\xBFŒ-™]/;

const looksBroken = (text: string): boolean =>
  text.includes(REPLACEMENT_CHAR) || MOJIBAKE.test(text);

const dataRowsOf = (input: ReadingStatementsInput): string[][] =>
  input.rows.slice(input.options.headerRows);

/** "Read as ; separated · comma decimals · day/month/year · UTF-8" — the folded section's one line. */
export const readingSummary = (options: ReadingOptions): string => {
  const separator = options.delimiter === '\t' ? 'tab' : options.delimiter;
  const parts = [
    `${separator} separated`,
    `${DECIMAL_NAMES[options.decimalSeparator] ?? options.decimalSeparator} decimals`,
    DATE_FORMAT_LABELS[options.dateFormat],
    ENCODING_LABELS[options.encoding],
  ];
  if (options.headerRows > 1) parts.push(`header on line ${options.headerRows}`);
  return `Read as ${parts.join(' · ')}`;
};

/** A file read from a preset or a saved mapping has nothing to be unsure about. */
export const RECOGNISED_CONFIDENCE: ReadingConfidence = {
  encoding: 'sure',
  delimiter: 'sure',
  headerRows: 'sure',
  dateFormat: 'sure',
  decimalSeparator: 'sure',
};

/** The guess split into the values to read with and the confidence behind each. */
export const splitGuess = (
  guess: ReadingGuess,
): { options: ReadingOptions; confidence: ReadingConfidence } => ({
  options: {
    encoding: guess.encoding.value,
    delimiter: guess.delimiter.value,
    headerRows: guess.headerRows.value,
    dateFormat: guess.dateFormat.value,
    decimalSeparator: guess.decimalSeparator.value,
  },
  confidence: {
    encoding: guess.encoding.confidence,
    delimiter: guess.delimiter.confidence,
    headerRows: guess.headerRows.confidence,
    dateFormat: guess.dateFormat.confidence,
    decimalSeparator: guess.decimalSeparator.confidence,
  },
});

export const allSure = (confidence: ReadingConfidence): boolean =>
  Object.values(confidence).every((level) => level === 'sure');

/** One sentence on where the reading came from, or why the section opened. Once an unsure reading
 * is folded, the user has confirmed it — "opened because…" would describe a section no longer open. */
export const readingNote = (
  confidence: ReadingConfidence,
  recognisedFrom: string | null,
  open: boolean,
): string => {
  if (recognisedFrom) return `From ${recognisedFrom}`;
  const unsure = Object.values(confidence).filter((level) => level === 'unsure').length;
  if (unsure === 0) return 'Guessed from the file';
  if (!open) return 'Checked by you';
  return unsure === 1
    ? 'Opened because one thing looked unsure.'
    : `Opened because ${unsure} things looked unsure.`;
};

/** Where a recognised file's reading came from, or `null` for a file read from the guess alone. */
export const readingSource = (
  savedMappingName: string | undefined,
  presetName: string | undefined,
): string | null => {
  if (savedMappingName) return `your saved mapping "${savedMappingName}"`;
  return presetName ? `the ${presetName} preset` : null;
};

/** The raw view: any preamble, the header line, then a few data lines, each cell flagged when its
 * letters look broken under the current encoding. */
const lineRole = (number: number, headerRows: number): ReadingLineVm['role'] => {
  if (number < headerRows) return 'preamble';
  return number === headerRows ? 'header' : 'data';
};

const readingCell = (text: string, role: ReadingLineVm['role']): ReadingCellVm => {
  const broken = looksBroken(text);
  if (broken) return { text, broken, color: 'warning', weight: 'bold' };
  return {
    text,
    broken,
    color: role === 'preamble' ? undefined : 'base-content',
    weight: role === 'header' ? 'semibold' : undefined,
  };
};

export const readingLines = (rows: string[][], headerRows: number): ReadingLineVm[] =>
  rows.slice(0, headerRows + DATA_LINES_SHOWN).map((row, index) => {
    const role = lineRole(index + 1, headerRows);
    return { number: index + 1, role, cells: row.map((text) => readingCell(text, role)) };
  });

const delimiterStatement = (input: ReadingStatementsInput): ReadingStatementVm => {
  const { delimiter, headerRows } = input.options;
  const counted = input.rows.slice(Math.max(headerRows - 1, 0));
  const columns = counted[0]?.length ?? 0;
  const matching = counted.filter((row) => row.length === columns).length;

  let evidence: string;
  if (counted.length === 0) evidence = 'The file has no lines to read';
  else if (counted.every((row) => row.length === 1)) evidence = 'Every line reads as one column';
  else if (matching === counted.length) evidence = `${columns} columns on every line`;
  else evidence = `${columns} columns on ${matching} of ${counted.length} lines`;

  return {
    key: 'delimiter',
    title: `Columns are split by ${DELIMITER_NAMES[delimiter] ?? delimiter}`,
    evidence,
    confidence: input.confidence.delimiter,
    current: delimiter,
    options: READING_DELIMITERS.map((value) => ({ value, label: DELIMITER_LABELS[value] })),
  };
};

const previewCells = (row: string[] | undefined): string =>
  (row ?? [])
    .filter((cell) => cell.trim() !== '')
    .slice(0, 3)
    .join(' · ');

const headerStatement = (input: ReadingStatementsInput): ReadingStatementVm => {
  const { headerRows } = input.options;
  const header = input.rows[headerRows - 1];
  const skipped =
    headerRows === 2
      ? 'line 1 above it is skipped'
      : `lines 1–${headerRows - 1} above it are skipped`;

  return {
    key: 'headerRows',
    title: `Line ${headerRows} is the header`,
    evidence: header ? 'Column names' : `The file has no line ${headerRows}`,
    highlight: header ? previewCells(header) : undefined,
    after: header ? `· ${headerRows > 1 ? skipped : 'data starts on line 2'}` : undefined,
    confidence: input.confidence.headerRows,
    current: headerRows,
    options: input.rows.slice(0, HEADER_CHOICES).map((row, index) => ({
      value: index + 1,
      label: `Line ${index + 1}`,
      preview: previewCells(row),
    })),
  };
};

/** The date that says the most: one only a single format reads, else the first date at all. */
const dateSample = (input: ReadingStatementsInput): string | undefined => {
  const dates = dataRowsOf(input)
    .flat()
    .map((cell) => cell.trim())
    .filter(looksLikeDate);
  const readers = (cell: string): number =>
    SUPPORTED_DATE_FORMATS.filter((format) => parseDate(cell, format) !== null).length;
  return dates.find((cell) => readers(cell) === 1) ?? dates[0];
};

const readDate = (cell: string, format: DateFormat): string => {
  const iso = parseDate(cell, format);
  return iso ? formatDateSpelled(iso) : 'not a date';
};

const dateStatement = (input: ReadingStatementsInput): ReadingStatementVm => {
  const { dateFormat } = input.options;
  const sample = dateSample(input);
  const parsed = sample ? parseDate(sample, dateFormat) : null;
  const fitsBoth =
    !!sample &&
    parseDate(sample, 'DD/MM/YYYY') !== null &&
    parseDate(sample, 'MM/DD/YYYY') !== null &&
    parseDate(sample, 'DD/MM/YYYY') !== parseDate(sample, 'MM/DD/YYYY');

  let evidence: string;
  if (!sample) evidence = 'No dates in the first lines';
  else if (parsed) evidence = `${sample} reads as`;
  else evidence = `${sample} does not read as a date this way`;

  return {
    key: 'dateFormat',
    title: `Dates are ${DATE_FORMAT_LABELS[dateFormat]}`,
    evidence,
    highlight: parsed ? formatDateSpelled(parsed) : undefined,
    after: parsed && fitsBoth ? '· every date so far fits both orders' : undefined,
    confidence: input.confidence.dateFormat,
    current: dateFormat,
    options: SUPPORTED_DATE_FORMATS.map((value) => ({
      value,
      label: DATE_FORMAT_LABELS[value],
      preview: sample ? readDate(sample, value) : undefined,
    })),
  };
};

/** The amount that says the most: one the two marks read differently, else the first at all. */
const amountSample = (input: ReadingStatementsInput): string | undefined => {
  const amounts = dataRowsOf(input)
    .flat()
    .map(amountCore)
    .filter((core): core is string => core !== null);
  return amounts.find((core) => parseAmount(core, ',') !== parseAmount(core, '.')) ?? amounts[0];
};

const readAmount = (core: string, mark: string): string => {
  const value = parseAmount(core, mark);
  return value === null ? 'not an amount' : formatCurrency(value, { signed: true });
};

const decimalStatement = (input: ReadingStatementsInput): ReadingStatementVm => {
  const { decimalSeparator } = input.options;
  const sample = amountSample(input);
  const value = sample ? parseAmount(sample, decimalSeparator) : null;

  let evidence: string;
  if (!sample) evidence = 'No amounts with decimals in the first lines';
  else if (value !== null) evidence = `${sample} reads as`;
  else evidence = `${sample} does not read as an amount this way`;

  return {
    key: 'decimalSeparator',
    title: `A ${DECIMAL_NAMES[decimalSeparator] ?? decimalSeparator} marks the decimals`,
    evidence,
    highlight: value !== null ? formatCurrency(value, { signed: true }) : undefined,
    confidence: input.confidence.decimalSeparator,
    current: decimalSeparator,
    options: READING_DECIMAL_SEPARATORS.map((mark) => ({
      value: mark,
      label: mark === ',' ? 'Comma' : 'Dot',
      preview: sample ? readAmount(sample, mark) : undefined,
    })),
  };
};

/** The first cell the two encodings read differently, with its reading under each. */
const encodingSample = (
  input: ReadingStatementsInput,
): { current: string; other: string } | undefined => {
  for (const [rowIndex, row] of input.rows.entries()) {
    for (const [cellIndex, current] of row.entries()) {
      const other = input.otherEncodingRows[rowIndex]?.[cellIndex];
      if (other !== undefined && other !== current) return { current, other };
    }
  }
  return undefined;
};

const encodingStatement = (input: ReadingStatementsInput): ReadingStatementVm => {
  const { encoding } = input.options;
  const sample = encodingSample(input);
  const accented = sample ? undefined : input.rows.flat().find((cell) => NON_ASCII.test(cell));
  const shown = sample?.current ?? accented;

  let evidence: string;
  if (!shown) evidence = 'Plain letters only — both encodings read it the same';
  else if (looksBroken(shown)) evidence = 'Some letters look broken:';
  else evidence = 'Accented letters read as';

  return {
    key: 'encoding',
    title: `Text is ${ENCODING_LABELS[encoding]}`,
    evidence,
    highlight: shown,
    confidence: input.confidence.encoding,
    current: encoding,
    options: SUPPORTED_ENCODINGS.map((value) => ({
      value,
      label: ENCODING_LABELS[value],
      preview: sample ? (value === encoding ? sample.current : sample.other) : undefined,
    })),
  };
};

/** The five statements, in the order the section lists them. */
export const readingStatements = (input: ReadingStatementsInput): ReadingStatementVm[] => [
  delimiterStatement(input),
  headerStatement(input),
  dateStatement(input),
  decimalStatement(input),
  encodingStatement(input),
];
