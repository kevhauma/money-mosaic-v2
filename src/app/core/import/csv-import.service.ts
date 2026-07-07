import { Injectable } from '@angular/core';
import Papa from 'papaparse';
import type { MappingProfile } from '@/core/data-access';
import type { CsvParseRequest, CsvParseResponse } from './csv-worker.types';

@Injectable({ providedIn: 'root' })
export class CsvImportService {
  parse = async (
    file: File,
    mappingProfile: Omit<MappingProfile, 'id'>,
  ): Promise<CsvParseResponse> => {
    const buffer = await file.arrayBuffer();
    const fileText = new TextDecoder(mappingProfile.encoding).decode(buffer);

    const request: CsvParseRequest = {
      fileText,
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
      worker.postMessage(request);
    });
  };

  detectHeaders = async (file: File, delimiter: string, encoding: string): Promise<string[]> => {
    const buffer = await file.arrayBuffer();
    const fileText = new TextDecoder(encoding).decode(buffer);
    const preview = Papa.parse<string[]>(fileText, { delimiter, header: false, preview: 1 });
    return preview.data[0] ?? [];
  };

  previewRawRows = async (
    file: File,
    delimiter: string,
    encoding: string,
    rowCount = 6,
  ): Promise<string[][]> => {
    const buffer = await file.arrayBuffer();
    const fileText = new TextDecoder(encoding).decode(buffer);
    const preview = Papa.parse<string[]>(fileText, {
      delimiter,
      header: false,
      skipEmptyLines: true,
      preview: rowCount,
    });
    return preview.data;
  };
}
