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

export type CsvParseResponse = { headers: string[]; rows: ParsedRowResult[] } | { error: string };
