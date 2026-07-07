import type {
  DateFormat,
  MappingProfileColumns,
  SignConvention,
  Transaction,
} from '@/core/data-access';

export type MappedTransaction = Omit<
  Transaction,
  'id' | 'accountId' | 'importBatchId' | 'fingerprint' | 'createdAt'
>;

export type ParsedRowResult =
  | { rowIndex: number; valid: true; transaction: MappedTransaction; balance?: number }
  | { rowIndex: number; valid: false; rawRow: Record<string, string>; errors: string[] };

export type RowMapOptions = {
  decimalSeparator: string;
  dateFormat: DateFormat;
  signConvention: SignConvention;
};

const parseAmount = (raw: string | undefined, decimalSeparator: string): number | null => {
  if (raw === undefined || raw.trim() === '') return null;
  let normalized = raw.trim();
  if (decimalSeparator === ',') {
    normalized = normalized.replace(/\./g, '').replace(',', '.');
  } else {
    normalized = normalized.replace(/,/g, '');
  }
  const value = Number(normalized);
  return Number.isFinite(value) ? value : null;
};

const pad2 = (value: number): string => value.toString().padStart(2, '0');

type DateField = 'year' | 'month' | 'day';

// Keyed by the full `DateFormat` union so adding a member without an entry here is a compile
// error, not a silent `null` at parse time.
const DATE_FORMAT_PATTERNS: Record<DateFormat, { regex: RegExp; fieldOrder: DateField[] }> = {
  'YYYY-MM-DD': { regex: /^(\d{4})-(\d{1,2})-(\d{1,2})$/, fieldOrder: ['year', 'month', 'day'] },
  'DD/MM/YYYY': { regex: /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/, fieldOrder: ['day', 'month', 'year'] },
  'MM/DD/YYYY': { regex: /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/, fieldOrder: ['month', 'day', 'year'] },
};

const parseDate = (raw: string | undefined, dateFormat: DateFormat): string | null => {
  if (raw === undefined || raw.trim() === '') return null;
  const value = raw.trim();

  // `dateFormat` is typed exhaustively, but a stored profile row can predate the union (no schema
  // migration for this — see TICKET-SOLID-02) — tolerate that as an unparseable date, not a crash.
  const pattern = DATE_FORMAT_PATTERNS[dateFormat];
  if (!pattern) return null;
  const { regex, fieldOrder } = pattern;
  const match = regex.exec(value);
  if (!match) return null;

  const fields = { year: 0, month: 0, day: 0 };
  fieldOrder.forEach((field, index) => {
    fields[field] = Number(match[index + 1]);
  });
  const { year, month, day } = fields;

  if (month < 1 || month > 12 || day < 1 || day > 31) return null;
  const date = new Date(Date.UTC(year, month - 1, day));
  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    return null;
  }
  return `${year}-${pad2(month)}-${pad2(day)}`;
};

const resolveAmount = (
  rawRow: Record<string, string>,
  mapping: MappingProfileColumns,
  opts: RowMapOptions,
): number | null => {
  if (mapping.amount) {
    return parseAmount(rawRow[mapping.amount], opts.decimalSeparator);
  }

  const debitRaw = mapping.debit ? rawRow[mapping.debit] : undefined;
  const creditRaw = mapping.credit ? rawRow[mapping.credit] : undefined;
  const debitFilled = debitRaw !== undefined && debitRaw.trim() !== '';
  const creditFilled = creditRaw !== undefined && creditRaw.trim() !== '';

  if (debitFilled === creditFilled) return null;

  const invertedConvention = opts.signConvention === 'credit-negative';

  if (debitFilled) {
    const value = parseAmount(debitRaw, opts.decimalSeparator);
    if (value === null) return null;
    return invertedConvention ? Math.abs(value) : -Math.abs(value);
  }

  const value = parseAmount(creditRaw, opts.decimalSeparator);
  if (value === null) return null;
  return invertedConvention ? -Math.abs(value) : Math.abs(value);
};

export const mapRow = (
  rawRow: Record<string, string>,
  mapping: MappingProfileColumns,
  opts: RowMapOptions,
  rowIndex: number,
): ParsedRowResult => {
  const errors: string[] = [];

  const bookingDate = parseDate(rawRow[mapping.date], opts.dateFormat);
  if (bookingDate === null) errors.push('unparseable date');

  const amount = resolveAmount(rawRow, mapping, opts);
  if (amount === null) errors.push('unparseable or ambiguous amount');

  const rawDescription = rawRow[mapping.description]?.trim() ?? '';
  if (rawDescription === '') errors.push('missing description');

  if (errors.length > 0 || bookingDate === null || amount === null) {
    return { rowIndex, valid: false, rawRow, errors };
  }

  const counterpartyName = mapping.counterpartyName
    ? rawRow[mapping.counterpartyName]?.trim() || undefined
    : undefined;
  const counterpartyIban = mapping.counterpartyIban
    ? rawRow[mapping.counterpartyIban]?.trim() || undefined
    : undefined;
  const balanceRaw = mapping.balance ? rawRow[mapping.balance] : undefined;
  const balance =
    balanceRaw !== undefined
      ? (parseAmount(balanceRaw, opts.decimalSeparator) ?? undefined)
      : undefined;

  return {
    rowIndex,
    valid: true,
    balance,
    transaction: {
      bookingDate,
      amount,
      currency: 'EUR',
      rawDescription,
      counterpartyName,
      counterpartyIban,
    },
  };
};

export const mapRows = (
  rawRows: Record<string, string>[],
  mapping: MappingProfileColumns,
  opts: RowMapOptions,
): ParsedRowResult[] => rawRows.map((rawRow, index) => mapRow(rawRow, mapping, opts, index));
