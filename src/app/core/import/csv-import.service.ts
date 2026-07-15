import { Injectable } from '@angular/core';
import Papa from 'papaparse';
import type { MappingProfile } from '@/core/data-access';
import type { CsvParseResponse, CsvParseWireRequest } from './csv-worker.types';

/** Plenty for headers + a handful of preview rows without reading the whole file (TICKET-IMP-06). */
const HEAD_SLICE_BYTES = 64 * 1024;

/**
 * A slice shorter than requested captured the whole file — nothing was cut off. Otherwise the
 * slice boundary may have landed mid-row (or mid multi-byte character); drop the possibly-truncated
 * tail line, which header/preview reads never need.
 */
const trimTruncatedTail = (decoded: string, sliceCoveredWholeFile: boolean): string => {
  if (sliceCoveredWholeFile) return decoded;
  const lastNewline = decoded.lastIndexOf('\n');
  return lastNewline === -1 ? decoded : decoded.slice(0, lastNewline + 1);
};

@Injectable({ providedIn: 'root' })
export class CsvImportService {
  /** Decoded file heads, cached per `(File, encoding)` so repeated wizard interactions don't re-read (TICKET-IMP-06). */
  private readonly headCache = new WeakMap<File, Map<string, string>>();

  private readonly decodeHead = async (file: File, encoding: string): Promise<string> => {
    const cached = this.headCache.get(file)?.get(encoding);
    if (cached !== undefined) return cached;

    const buffer = await file.slice(0, HEAD_SLICE_BYTES).arrayBuffer();
    const decoded = new TextDecoder(encoding, { fatal: false }).decode(buffer);
    const text = trimTruncatedTail(decoded, file.size <= HEAD_SLICE_BYTES);

    const byEncoding = this.headCache.get(file) ?? new Map<string, string>();
    byEncoding.set(encoding, text);
    this.headCache.set(file, byEncoding);
    return text;
  };

  parse = async (
    file: File,
    mappingProfile: Omit<MappingProfile, 'id'>,
  ): Promise<CsvParseResponse> => {
    const buffer = await file.arrayBuffer();

    const request: CsvParseWireRequest = {
      buffer,
      encoding: mappingProfile.encoding,
      delimiter: mappingProfile.delimiter,
      headerRows: mappingProfile.headerRows,
      mapping: mappingProfile.columns,
      decimalSeparator: mappingProfile.decimalSeparator,
      dateFormat: mappingProfile.dateFormat,
      signConvention: mappingProfile.signConvention,
    };

    return new Promise<CsvParseResponse>((resolve, reject) => {
      const worker = new Worker(new URL('./csv-parse.worker', import.meta.url));
      worker.onmessage = ({ data: response }: MessageEvent<CsvParseResponse>) => {
        worker.terminate();
        resolve(response);
      };
      worker.onerror = (event: ErrorEvent) => {
        worker.terminate();
        reject(new Error(event.message));
      };
      worker.postMessage(request, [buffer]);
    });
  };

  detectHeaders = async (file: File, delimiter: string, encoding: string): Promise<string[]> => {
    const fileText = await this.decodeHead(file, encoding);
    const preview = Papa.parse<string[]>(fileText, { delimiter, header: false, preview: 1 });
    return preview.data[0] ?? [];
  };

  previewRawRows = async (
    file: File,
    delimiter: string,
    encoding: string,
    rowCount = 6,
  ): Promise<string[][]> => {
    const fileText = await this.decodeHead(file, encoding);
    const preview = Papa.parse<string[]>(fileText, {
      delimiter,
      header: false,
      skipEmptyLines: true,
      preview: rowCount,
    });
    return preview.data;
  };
}
