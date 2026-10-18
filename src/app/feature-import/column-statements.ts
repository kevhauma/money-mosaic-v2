import type { FormControl } from '@angular/forms';
import type { DateFormat, SignConvention } from '@/core/data-access';
import {
  parseAmount,
  parseDate,
  type AmountMode,
  type ColumnConfidence,
  type ColumnGuess,
} from '@/core/import';
import type { BadgeColor } from '@/shared/ui';
import { formatCurrency, formatDateSpelled } from '@/shared/utils';
import {
  COLUMN_FIELD_DEFS,
  duplicateWarnings,
  type ColumnFieldKey,
  type ColumnMappingFormValue,
} from './column-mapping';

/**
 * The Columns section's view-model (TICKET-IMP-17): one row per field — the column it reads from,
 * what the first line reads as through the parser's own `parseDate`/`parseAmount` under the current
 * reading settings, and a sure / check-this / not-found marker taken from `guessColumns`. Pure: the
 * map step calls it again whenever a column, a reading setting or the amount mode changes.
 */

/** The map step's nine column controls, which the section's selects bind to. */
export type ColumnControls = Record<ColumnFieldKey, FormControl<string>>;

/** `set` is a column the guess did not propose: the user's own pick, or a recognised mapping's. */
export type ColumnMarker = ColumnConfidence | 'set';

export type ColumnRowVm = {
  key: ColumnFieldKey;
  label: string;
  reason?: string;
  /** "30/09/2026 reads as 30 Sep 2026", or empty when the field has no column. */
  reading: string;
  /** The value does not read as what the field needs. */
  readingProblem: boolean;
  marker: ColumnMarker;
  markerLabel: string;
  markerColor: BadgeColor;
  /** "or maybe: Omschrijving" for a doubtful guess. */
  runnerUp?: string;
  /** "Also used for Amount" when two fields share this row's column. */
  clash?: string;
};

export type ColumnGroupVm = {
  id: 'needed' | 'optional';
  title: string;
  caption?: string;
  /** The needed group carries the one column / money in + money out switch. */
  amountSwitch: boolean;
  rows: ColumnRowVm[];
};

export type ColumnStatementsInput = {
  headers: string[];
  /** The data lines under the header, as read now. */
  rows: string[][];
  value: ColumnMappingFormValue;
  guess: ColumnGuess;
  amountMode: AmountMode;
  reading: { dateFormat: DateFormat; decimalSeparator: string };
  signConvention: SignConvention;
};

const MARKERS: Record<ColumnMarker, { label: string; color: BadgeColor }> = {
  sure: { label: '✓ sure', color: 'success' },
  check: { label: 'check this', color: 'warning' },
  missing: { label: 'not found', color: 'neutral' },
  set: { label: '✓ set', color: 'success' },
};

const NEEDED: Record<AmountMode, ColumnFieldKey[]> = {
  single: ['date', 'amount', 'description'],
  split: ['date', 'debit', 'credit', 'description'],
};
const OPTIONAL: ColumnFieldKey[] = ['counterpartyName', 'counterpartyIban', 'ownIban', 'balance'];

const defOf = (key: ColumnFieldKey) => COLUMN_FIELD_DEFS.find((field) => field.key === key)!;

const cellsOf = (input: ColumnStatementsInput, column: string): string[] => {
  const index = input.headers.indexOf(column);
  return index === -1 ? [] : input.rows.map((row) => (row[index] ?? '').trim());
};

type Read = { text: string; problem: boolean };

/** The parser's own rule for a split pair (csv-row-mapper `resolveAmount`): money out is negative
 * and money in positive, both swapped by a `credit-negative` mapping. A single column reads as-is. */
const SPLIT_SIGN: Partial<Record<ColumnFieldKey, number>> = { debit: -1, credit: 1 };

const readMoney = (cell: string, input: ColumnStatementsInput, key: ColumnFieldKey): Read => {
  const value = parseAmount(cell, input.reading.decimalSeparator);
  if (value === null) return { text: `${cell} doesn’t read as an amount`, problem: true };
  const sign = SPLIT_SIGN[key];
  const swap = input.signConvention === 'credit-negative' ? -1 : 1;
  const signed = sign === undefined ? value : Math.abs(value) * sign * swap;
  return { text: `${cell} reads as ${formatCurrency(signed, { signed: true })}`, problem: false };
};

const readCell = (
  cell: string,
  cells: string[],
  key: ColumnFieldKey,
  input: ColumnStatementsInput,
): Read => {
  if (key === 'date') {
    const iso = parseDate(cell, input.reading.dateFormat);
    return iso
      ? { text: `${cell} reads as ${formatDateSpelled(iso)}`, problem: false }
      : { text: `${cell} doesn’t read as a date`, problem: true };
  }
  if (key === 'amount' || key === 'debit' || key === 'credit' || key === 'balance') {
    return readMoney(cell, input, key);
  }
  const sameEverywhere = cells.length > 1 && cells.every((other) => other === cell);
  return { text: sameEverywhere ? `${cell}, the same on every line` : cell, problem: false };
};

/** The first line's value; a sparse column (money in on a payment line) shows its first filled one. */
const readingFor = (input: ColumnStatementsInput, key: ColumnFieldKey, column: string): Read => {
  const cells = cellsOf(input, column);
  const index = cells.findIndex((cell) => cell !== '');
  if (index === -1) return { text: 'Empty in the first lines', problem: cells.length > 0 };
  const read = readCell(cells[index], cells, key, input);
  return index === 0 ? read : { ...read, text: `Line ${index + 1}: ${read.text}` };
};

const markerFor = (
  input: ColumnStatementsInput,
  key: ColumnFieldKey,
  column: string,
): ColumnMarker => {
  if (!column) return 'missing';
  const guessed = input.guess.fields[key];
  return guessed.column === column ? guessed.confidence : 'set';
};

const rowFor = (
  input: ColumnStatementsInput,
  key: ColumnFieldKey,
  clashes: Partial<Record<ColumnFieldKey, string>>,
): ColumnRowVm => {
  const def = defOf(key);
  const column = input.value[key] ?? '';
  const marker = markerFor(input, key, column);
  const read = column ? readingFor(input, key, column) : { text: '', problem: false };
  const guessed = input.guess.fields[key];
  return {
    key,
    label: def.label,
    reason: def.reason,
    reading: read.text,
    readingProblem: read.problem,
    marker,
    markerLabel: MARKERS[marker].label,
    markerColor: MARKERS[marker].color,
    runnerUp: marker === 'check' && guessed.runnerUp ? `or maybe: ${guessed.runnerUp}` : undefined,
    clash: clashes[key],
  };
};

/** "Needed" then "Also found", with the amount rows following the amount mode. */
export const columnGroups = (input: ColumnStatementsInput): ColumnGroupVm[] => {
  const clashes = duplicateWarnings(input.value);
  return [
    {
      id: 'needed',
      title: 'Needed',
      amountSwitch: true,
      rows: NEEDED[input.amountMode].map((key) => rowFor(input, key, clashes)),
    },
    {
      id: 'optional',
      title: 'Also found',
      caption: 'These make rules and transfers smarter.',
      amountSwitch: false,
      rows: OPTIONAL.map((key) => rowFor(input, key, clashes)),
    },
  ];
};

/** The needed fields still without a column — what keeps "Looks right" disabled. */
export const missingColumns = (value: ColumnMappingFormValue, amountMode: AmountMode): string[] =>
  NEEDED[amountMode].filter((key) => !value[key]).map((key) => defOf(key).label);

/** "Date ← Boekingsdatum · Amount ← Bedrag · Description ← Omschrijving · 3 more" — the folded line. */
export const columnsSummary = (value: ColumnMappingFormValue, amountMode: AmountMode): string => {
  const needed = NEEDED[amountMode]
    .filter((key) => value[key])
    .map((key) => `${defOf(key).label} ← ${value[key]}`);
  const more = OPTIONAL.filter((key) => value[key]).length;
  return more > 0 ? [...needed, `${more} more`].join(' · ') : needed.join(' · ');
};

/** The name a remembered mapping starts with: the file's own, without its extension. */
export const mappingNameFor = (fileName: string): string =>
  fileName.replace(/\.[^.]+$/, '').trim() || 'Custom mapping';
