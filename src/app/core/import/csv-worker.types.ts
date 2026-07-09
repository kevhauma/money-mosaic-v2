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

export type CsvParseResponse =
  | { headers: string[]; rows: ParsedRowResult[]; warnings: string[] }
  | { error: string }
  // Structural mismatch between the mapping's referenced columns and this file's actual header
  // row — distinct from `error` (a hard parse failure) and from per-row `ParsedRowResult` errors
  // (FR-IMP-8 malformed data), so the wizard can block the file with a specific message instead
  // of silently mapping every row wrong.
  | { headerMismatch: true; missingColumns: string[]; headers: string[] };
