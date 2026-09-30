import type { CsvEncoding, DateFormat, SignConvention } from './entities';

/**
 * The option lists behind three of the shared CSV unions, kept in the Angular workspace because
 * only the import wizard's dropdowns iterate them — `shared/` declares the unions and may hold no
 * UI affordances. `satisfies` ties each list to its union, so adding a value in one place without
 * the other stops compiling.
 *
 * They lived in `app-db.ts` until TICKET-SRV-08 deleted it; they were never about the database, so
 * they moved here rather than going with it. The `core/data-access` barrel re-exports this module,
 * which is why no import path in `src/app/` changed.
 */
export const SIGN_CONVENTIONS = [
  'as-is',
  'debit-negative',
  'credit-negative',
] as const satisfies readonly SignConvention[];

export const SUPPORTED_DATE_FORMATS = [
  'DD/MM/YYYY',
  'YYYY-MM-DD',
  'MM/DD/YYYY',
] as const satisfies readonly DateFormat[];

export const SUPPORTED_ENCODINGS = [
  'utf-8',
  'windows-1252',
] as const satisfies readonly CsvEncoding[];
