import type { MappingProfileColumns } from '@/core/data-access';
import type { ParsedRowResult, RowMapOptions } from './csv-row-mapper';

export type CsvParseRequest = {
  fileText: string;
  delimiter: string;
  headerRows: number;
  mapping: MappingProfileColumns;
  decimalSeparator: RowMapOptions['decimalSeparator'];
  dateFormat: RowMapOptions['dateFormat'];
  signConvention: RowMapOptions['signConvention'];
};

/**
 * Posted across the worker boundary in place of `CsvParseRequest` (TICKET-IMP-06): carries the raw
 * file bytes and encoding instead of a pre-decoded `fileText`, so `postMessage` transfers the buffer
 * (zero-copy, detaching it on the main thread) instead of structured-cloning a copy of the decoded
 * string. The worker decodes `buffer` with `encoding` into `fileText` before calling `parseCsvText`.
 */
export type CsvParseWireRequest = Omit<CsvParseRequest, 'fileText'> & {
  buffer: ArrayBuffer;
  encoding: string;
};

export type CsvParseResponse =
  | { headers: string[]; rows: ParsedRowResult[]; warnings: string[] }
  | { error: string }
  // Structural mismatch between the mapping's referenced columns and this file's actual header
  // row — distinct from `error` (a hard parse failure) and from per-row `ParsedRowResult` errors
  // (FR-IMP-8 malformed data), so the wizard can block the file with a specific message instead
  // of silently mapping every row wrong.
  | { headerMismatch: true; missingColumns: string[]; headers: string[] };
