import type { MappingProfileColumns } from '@/core/data-access';
import { amountCore, looksLikeDate, type ReadingOptions } from './reading-guess';
import { parseAmount } from './csv-row-mapper';

/**
 * Works out which column of a file is the date, the amount, the description and the rest
 * (TICKET-IMP-17), so mapping an unfamiliar export is a check rather than nine dropdowns. Pure:
 * the caller hands over the header line and the data lines as already read (TICKET-IMP-16).
 *
 * Each column is scored against each field twice — by its header, against Dutch, French and
 * English bank vocabulary, and by the values under it (dates, amounts, IBANs, the same IBAN on
 * every line, long text) — and fields take columns highest score first, so no column serves two
 * fields. A guess is sure only when something real backs it and no free column comes close.
 */

export type ColumnKey = keyof MappingProfileColumns;

export type ColumnConfidence = 'sure' | 'check' | 'missing';

export type AmountMode = 'single' | 'split';

export type FieldGuess = {
  column: string | null;
  confidence: ColumnConfidence;
  /** The next-best free column, named only when the guess is `check`. */
  runnerUp?: string;
};

export type ColumnGuess = { amountMode: AmountMode; fields: Record<ColumnKey, FieldGuess> };

/** The order fields claim columns in when two score the same: what an import needs first. */
export const COLUMN_KEYS: ColumnKey[] = [
  'date',
  'amount',
  'debit',
  'credit',
  'description',
  'counterpartyName',
  'counterpartyIban',
  'ownIban',
  'balance',
];

/** A column below this is no candidate at all. */
const MIN_SCORE = 2;
/** A free column this close to the pick makes the pick doubtful. */
const CLEAR_LEAD = 2;
/** Values alone this strong (dates; an IBAN that is constant or varying) are enough to be sure. */
const STRONG_VALUES = 3;
/** The share of a column's filled cells that must fit a shape for the column to have it. */
const SHAPE_SHARE = 0.8;

const EXACT_NAME = 3;
const PARTIAL_NAME = 2;
const WEAK_NAME = 1;
const CONTRADICTED_NAME = -1;

/** A phrase is one string, or several that must all appear (`['tegenpartij', 'rekening']`). */
type Phrase = string | string[];

type Vocabulary = { exact: string[]; partial: Phrase[]; weak?: string[]; not?: string[] };

const COUNTERPARTY_WORDS = [
  'tegenpartij',
  'counterparty',
  'contrepartie',
  'payee',
  'beneficiary',
  'beneficiaire',
  'begunstigde',
];
const ACCOUNT_WORDS = ['rekening', 'iban', 'account', 'compte', 'konto'];

const COUNTERPARTY_ACCOUNT: Phrase[] = [
  'tegenrekening',
  ...COUNTERPARTY_WORDS.flatMap((who) => ACCOUNT_WORDS.map((account) => [who, account])),
];

const VOCABULARY: Record<ColumnKey, Vocabulary> = {
  date: {
    exact: ['datum', 'date', 'boekingsdatum', 'booking date', 'transaction date', 'buchungstag'],
    partial: [
      'boekingsdatum',
      'booking',
      'comptabilisation',
      'uitvoering',
      'execution',
      'datum',
      'date',
    ],
    not: ['valuta', 'value', 'valeur', 'wert'],
  },
  amount: {
    exact: ['bedrag', 'amount', 'montant', 'betrag'],
    partial: ['bedrag', 'amount', 'montant', 'betrag'],
    not: ['saldo', 'balance', 'solde'],
  },
  debit: {
    exact: [
      'debet',
      'debit',
      'af',
      'uit',
      'uitgaven',
      'money out',
      'paid out',
      'withdrawal',
      'withdrawals',
      'sortie',
      'sorties',
    ],
    partial: [
      'debet',
      'debit',
      'uitgaand',
      'withdraw',
      'sortie',
      ['out', 'money'],
      ['out', 'paid'],
      ['out', 'amount'],
      ['af', 'bedrag'],
      ['uit', 'bedrag'],
    ],
  },
  credit: {
    exact: [
      'credit',
      'krediet',
      'bij',
      'in',
      'inkomsten',
      'money in',
      'paid in',
      'deposit',
      'deposits',
      'entree',
      'entrees',
    ],
    partial: [
      'credit',
      'krediet',
      'inkomend',
      'deposit',
      'entree',
      ['in', 'money'],
      ['in', 'paid'],
      ['in', 'amount'],
      ['bij', 'bedrag'],
      ['in', 'bedrag'],
    ],
  },
  description: {
    exact: [
      'omschrijving',
      'description',
      'mededeling',
      'mededelingen',
      'communication',
      'libelle',
      'details',
      'memo',
      'narrative',
    ],
    partial: [
      'omschrijving',
      'description',
      'mededeling',
      'communication',
      'libelle',
      'detail',
      'memo',
      'narrative',
      'verwendungszweck',
    ],
    not: ['gestructureerd', 'structured', 'structuree'],
  },
  counterpartyName: {
    exact: [
      'naam tegenpartij',
      'tegenpartij',
      'counterparty',
      'counterparty name',
      'payee',
      'beneficiary',
      'begunstigde',
      'contrepartie',
      'nom contrepartie',
    ],
    partial: COUNTERPARTY_WORDS,
    weak: ['naam', 'name', 'nom'],
    not: [...ACCOUNT_WORDS, 'nummer', 'number', 'numero', 'bic', 'adres', 'address', 'adresse'],
  },
  counterpartyIban: {
    exact: ['tegenrekening'],
    partial: COUNTERPARTY_ACCOUNT,
    not: ['bic', 'naam', 'name', 'nom', 'adres', 'address'],
  },
  ownIban: {
    exact: [
      'rekening',
      'rekeningnummer',
      'account',
      'account number',
      'iban',
      'compte',
      'numero de compte',
      'konto',
    ],
    partial: ACCOUNT_WORDS,
    not: [...COUNTERPARTY_WORDS, 'tegenrekening', 'bic', 'naam', 'name', 'nom'],
  },
  balance: {
    exact: ['saldo', 'balance', 'solde', 'running balance', 'kontostand'],
    partial: ['saldo', 'balance', 'solde'],
  },
};

/** Lower case, accents off, anything but letters and digits a single space. */
const normalise = (header: string): string =>
  header
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();

/** The longest word that still only counts as a whole word: `in`, `af`, `out` inside another word
 * are noise, while Dutch compounds (`boekingsdatum`, `rekeningnummer`) are why longer ones may. */
const SHORT_WORD = 3;

const hasPart = (name: string, part: string): boolean =>
  part.length <= SHORT_WORD ? name.split(' ').includes(part) : name.includes(part);

const hasPhrase = (name: string, phrase: Phrase): boolean =>
  (typeof phrase === 'string' ? [phrase] : phrase).every((part) => hasPart(name, part));

const nameScore = (header: string, vocabulary: Vocabulary): number => {
  const name = normalise(header);
  if (name === '') return 0;
  if (vocabulary.not?.some((word) => hasPart(name, word))) return CONTRADICTED_NAME;
  if (vocabulary.exact.includes(name)) return EXACT_NAME;
  if (vocabulary.partial.some((phrase) => hasPhrase(name, phrase))) return PARTIAL_NAME;
  if (vocabulary.weak?.some((word) => hasPart(name, word))) return WEAK_NAME;
  return 0;
};

const IBAN = /^[A-Z]{2}\d{2}[A-Z0-9]{8,30}$/;
const isIban = (cell: string): boolean => IBAN.test(cell.replace(/\s/g, '').toUpperCase());

/** What the values under one header look like. Every share is of the column's filled cells. */
type ColumnShape = {
  rows: number;
  filled: number;
  dates: boolean;
  amounts: boolean;
  negatives: boolean;
  ibans: boolean;
  text: boolean;
  constant: boolean;
  varying: boolean;
  averageLength: number;
};

const share = (cells: string[], test: (cell: string) => boolean): boolean =>
  cells.length > 0 && cells.filter(test).length / cells.length >= SHAPE_SHARE;

const isText = (cell: string): boolean =>
  /\p{L}/u.test(cell) && !isIban(cell) && !looksLikeDate(cell) && amountCore(cell) === null;

const shapeOf = (cells: string[], decimalSeparator: string): ColumnShape => {
  const filled = cells.map((cell) => cell.trim()).filter((cell) => cell !== '');
  const distinct = new Set(filled).size;
  return {
    rows: cells.length,
    filled: filled.length,
    dates: share(filled, looksLikeDate),
    amounts: share(filled, (cell) => amountCore(cell) !== null),
    negatives: filled.some((cell) => (parseAmount(cell, decimalSeparator) ?? 0) < 0),
    ibans: share(filled, isIban),
    text: share(filled, isText),
    constant: cells.length >= 2 && filled.length === cells.length && distinct === 1,
    varying: distinct > 1,
    averageLength: filled.reduce((sum, cell) => sum + cell.length, 0) / (filled.length || 1),
  };
};

/** A column whose values contradict a field outright — dates under "Bedrag" — never gets it. */
const CONTRADICTED = -3;

type ShapeContext = { shape: ColumnShape; longestText: boolean };

const full = (shape: ColumnShape): boolean => shape.filled === shape.rows;

const VALUE_SCORES: Record<ColumnKey, (context: ShapeContext) => number> = {
  date: ({ shape }) => (shape.dates ? 3 : CONTRADICTED),
  amount: ({ shape }) => {
    if (!shape.amounts) return CONTRADICTED;
    return full(shape) ? 2 + (shape.negatives ? 1 : 0) : 0;
  },
  debit: ({ shape }) => (shape.amounts ? 1 + (full(shape) ? 0 : 1) : CONTRADICTED),
  credit: ({ shape }) => (shape.amounts ? 1 + (full(shape) ? 0 : 1) : CONTRADICTED),
  description: ({ shape, longestText }) => {
    if (!shape.text) return -2;
    if (shape.constant) return -2;
    return 1 + (longestText ? 1 : 0);
  },
  counterpartyName: ({ shape }) => {
    if (!shape.text) return -2;
    return shape.constant ? -2 : 1;
  },
  counterpartyIban: ({ shape }) => {
    if (!shape.ibans) return CONTRADICTED;
    if (shape.constant) return CONTRADICTED;
    return 2 + (shape.varying ? 1 : 0);
  },
  ownIban: ({ shape }) => {
    if (!shape.ibans) return CONTRADICTED;
    if (shape.varying) return CONTRADICTED;
    return 2 + (shape.constant ? 1 : 0);
  },
  balance: ({ shape }) => (shape.amounts && full(shape) ? 1 : CONTRADICTED),
};

type Candidate = { key: ColumnKey; column: string; index: number; name: number; score: number };

/** Every field scored against every column. A header-only file has no values to judge: name only. */
const scoreAll = (
  headers: string[],
  rows: string[][],
  reading: Pick<ReadingOptions, 'decimalSeparator'>,
): Candidate[] => {
  const shapes = headers.map((_, index) =>
    shapeOf(
      rows.map((row) => row[index] ?? ''),
      reading.decimalSeparator,
    ),
  );
  const longest = Math.max(0, ...shapes.filter((s) => s.text).map((s) => s.averageLength));

  return COLUMN_KEYS.flatMap((key) =>
    headers.map((column, index) => {
      const shape = shapes[index];
      const name = nameScore(column, VOCABULARY[key]);
      const longestText = shape.text && shape.averageLength === longest;
      const values = shape.filled === 0 ? 0 : VALUE_SCORES[key]({ shape, longestText });
      return { key, column, index, name, score: name + values };
    }),
  );
};

const bestFor = (candidates: Candidate[], key: ColumnKey): number =>
  Math.max(0, ...candidates.filter((c) => c.key === key).map((c) => c.score));

/** Money out + money in when that pair beats the best signed column ("Amount in" / "Amount out"
 * both half-match "amount", but sparse values are a pair's, not a signed column's); else one column. */
const chooseAmountMode = (candidates: Candidate[]): AmountMode => {
  const single = bestFor(candidates, 'amount');
  const split = Math.min(bestFor(candidates, 'debit'), bestFor(candidates, 'credit'));
  return split >= MIN_SCORE && split > single ? 'split' : 'single';
};

const inactiveKeys = (mode: AmountMode): ColumnKey[] =>
  mode === 'single' ? ['debit', 'credit'] : ['amount'];

/** Highest score first; a tie goes to the field an import needs first, then the leftmost column. */
const byStrength = (a: Candidate, b: Candidate): number =>
  b.score - a.score || COLUMN_KEYS.indexOf(a.key) - COLUMN_KEYS.indexOf(b.key) || a.index - b.index;

const assign = (candidates: Candidate[]): Map<ColumnKey, Candidate> => {
  const picks = new Map<ColumnKey, Candidate>();
  const taken = new Set<number>();
  for (const candidate of [...candidates].sort(byStrength)) {
    if (picks.has(candidate.key) || taken.has(candidate.index)) continue;
    picks.set(candidate.key, candidate);
    taken.add(candidate.index);
  }
  return picks;
};

const MISSING: FieldGuess = { column: null, confidence: 'missing' };

const judge = (
  pick: Candidate | undefined,
  candidates: Candidate[],
  takenElsewhere: Set<number>,
): FieldGuess => {
  if (!pick) return MISSING;
  const runnerUp = candidates
    .filter((c) => c.key === pick.key && c.index !== pick.index && !takenElsewhere.has(c.index))
    .sort(byStrength)[0];
  const backed = pick.name > 0 || pick.score - pick.name >= STRONG_VALUES;
  const close = !!runnerUp && runnerUp.score > pick.score - CLEAR_LEAD;
  if (backed && !close) return { column: pick.column, confidence: 'sure' };
  return {
    column: pick.column,
    confidence: 'check',
    runnerUp: close ? runnerUp.column : undefined,
  };
};

/**
 * `headers` is the file's header line, `rows` the data lines under it, both as read with the
 * confirmed reading settings; `reading.decimalSeparator` is what tells a negative amount.
 */
export const guessColumns = (
  headers: string[],
  rows: string[][],
  reading: Pick<ReadingOptions, 'decimalSeparator'>,
): ColumnGuess => {
  const scored = scoreAll(headers, rows, reading);
  const amountMode = chooseAmountMode(scored);
  const inactive = inactiveKeys(amountMode);
  const candidates = scored.filter((c) => c.score >= MIN_SCORE && !inactive.includes(c.key));
  const picks = assign(candidates);

  const fields = Object.fromEntries(
    COLUMN_KEYS.map((key) => {
      const pick = picks.get(key);
      const takenElsewhere = new Set(
        [...picks.values()].filter((other) => other.key !== key).map((other) => other.index),
      );
      return [key, judge(pick, candidates, takenElsewhere)];
    }),
  ) as Record<ColumnKey, FieldGuess>;

  return { amountMode, fields };
};
