import { parseCsvText } from './csv-parse';
import type { CsvParseRequest, CsvParseResponse } from './csv-worker.types';

const postResponse = (response: CsvParseResponse): void =>
  (self as unknown as { postMessage: (message: CsvParseResponse) => void }).postMessage(response);

self.onmessage = ({ data: request }: MessageEvent<CsvParseRequest>) => {
  try {
    postResponse(parseCsvText(request));
  } catch (error) {
    postResponse({ error: error instanceof Error ? error.message : 'Unknown CSV parse error' });
  }
};
