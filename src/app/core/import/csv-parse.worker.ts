import { parseCsvText } from './csv-parse';
import type { CsvParseWireRequest, CsvParseResponse } from './csv-worker.types';

const postResponse = (response: CsvParseResponse): void =>
  (self as unknown as { postMessage: (message: CsvParseResponse) => void }).postMessage(response);

self.onmessage = ({ data: request }: MessageEvent<CsvParseWireRequest>) => {
  try {
    const { buffer, encoding, ...rest } = request;
    const fileText = new TextDecoder(encoding).decode(buffer);
    postResponse(parseCsvText({ ...rest, fileText }));
  } catch (error) {
    postResponse({ error: error instanceof Error ? error.message : 'Unknown CSV parse error' });
  }
};
