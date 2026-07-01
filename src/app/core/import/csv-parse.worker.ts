import Papa from 'papaparse';
import { mapRows } from './csv-row-mapper';
import type { CsvParseRequest, CsvParseResponse } from './csv-worker.types';

const postResponse = (response: CsvParseResponse): void =>
  (self as unknown as { postMessage: (message: CsvParseResponse) => void }).postMessage(response);

self.onmessage = ({ data: request }: MessageEvent<CsvParseRequest>) => {
  try {
    const parsed = Papa.parse<string[]>(request.fileText, {
      delimiter: request.delimiter,
      header: false,
      skipEmptyLines: true,
      worker: false,
    });

    const headers = parsed.data[request.headerRows - 1] ?? [];
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

    postResponse({ headers, rows });
  } catch (error) {
    postResponse({ error: error instanceof Error ? error.message : 'Unknown CSV parse error' });
  }
};
