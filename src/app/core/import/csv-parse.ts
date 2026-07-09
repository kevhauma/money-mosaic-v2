import Papa from 'papaparse';
import { findMissingMappedColumns, mapRows } from './csv-row-mapper';
import type { CsvParseRequest, CsvParseResponse } from './csv-worker.types';

// A control char (SOH) that never occurs in decoded bank-CSV text. Passed as PapaParse's quoteChar
// to fully disable quote processing on the lenient re-parse (see parseCsvText). Built via
// fromCharCode so no literal control byte lives in the source file.
const NO_QUOTE_CHAR = String.fromCharCode(1);

/**
 * Parses CSV text into mapped transaction rows, recovering from quote-swallowing.
 *
 * Some bank exports (e.g. KBC) use `"` as a literal character inside `;`-delimited fields rather
 * than as RFC-4180 field quoting. When such a `"` opens a field but its closing `"` isn't followed
 * by a delimiter, PapaParse keeps scanning across newlines for a "properly terminated" quote and
 * silently merges the rest of the file into a single field — dropping hundreds of rows with no error
 * surfaced. We detect that (a shortfall between emitted rows and physical non-empty lines, or a
 * PapaParse quote error) and re-parse once with quote processing disabled, adopting the result only
 * when it recovers more rows. Any residual quote problem is reported via `warnings` so nothing fails
 * silently.
 */
export const parseCsvText = (request: CsvParseRequest): CsvParseResponse => {
  const nonEmptyLines = request.fileText
    .split(/\r\n|\r|\n/)
    .filter((line) => line.trim() !== '').length;

  const parseWith = (quoteChar?: string): Papa.ParseResult<string[]> =>
    Papa.parse<string[]>(request.fileText, {
      delimiter: request.delimiter,
      header: false,
      skipEmptyLines: true,
      worker: false,
      ...(quoteChar !== undefined ? { quoteChar } : {}),
    });

  let parsed = parseWith();
  const warnings: string[] = [];

  const quoteErrors = parsed.errors.filter((error) => error.type === 'Quotes');
  const linesSwallowed = parsed.data.length < nonEmptyLines;

  if (quoteErrors.length > 0 || linesSwallowed) {
    const lenient = parseWith(NO_QUOTE_CHAR);
    if (lenient.data.length > parsed.data.length) {
      const recovered = lenient.data.length - parsed.data.length;
      warnings.push(
        `${recovered} row(s) were merged by stray quote characters and recovered by re-parsing ` +
          `without quote handling.`,
      );
      parsed = lenient;
    } else if (quoteErrors.length > 0) {
      const first = quoteErrors[0];
      const where = typeof first.row === 'number' ? ` near line ${first.row + 1}` : '';
      warnings.push(`Stray quote characters detected${where}; some rows may be malformed.`);
    }
  }

  const headers = parsed.data[request.headerRows - 1] ?? [];

  const missingColumns = findMissingMappedColumns(headers, request.mapping);
  if (missingColumns.length > 0) {
    return { headerMismatch: true, missingColumns, headers };
  }

  const dataRows = parsed.data.slice(request.headerRows);
  const rawRows: Record<string, string>[] = dataRows.map((row) => {
    const rawRow: Record<string, string> = {};
    headers.forEach((header, index) => {
      rawRow[header] = row[index] ?? '';
    });
    return rawRow;
  });

  const rows = mapRows(rawRows, request.mapping, {
    decimalSeparator: request.decimalSeparator,
    dateFormat: request.dateFormat,
    signConvention: request.signConvention,
  });

  return { headers, rows, warnings };
};
