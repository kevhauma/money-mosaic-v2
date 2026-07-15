import { TestBed } from '@angular/core/testing';
import { vi } from 'vitest';
import type { MappingProfile } from '@/core/data-access';
import { CsvImportService } from './csv-import.service';
import type { CsvParseResponse, CsvParseWireRequest } from './csv-worker.types';

class FakeWorker {
  static instances: FakeWorker[] = [];

  onmessage: ((event: MessageEvent<CsvParseResponse>) => void) | null = null;
  onerror: ((event: ErrorEvent) => void) | null = null;
  postedMessages: { data: CsvParseWireRequest; transfer?: Transferable[] }[] = [];
  terminated = false;

  constructor(public readonly url: URL | string) {
    FakeWorker.instances.push(this);
  }

  postMessage(data: CsvParseWireRequest, transfer?: Transferable[]): void {
    this.postedMessages.push({ data, transfer });
    // Mirrors the browser's structured-clone-with-transfer algorithm: transferring an ArrayBuffer
    // detaches it on the sending side (TICKET-IMP-06's "buffer is detached" acceptance criterion).
    if (transfer && transfer.length > 0) structuredClone(data, { transfer });
  }

  terminate(): void {
    this.terminated = true;
  }

  emitMessage(data: CsvParseResponse): void {
    this.onmessage?.({ data } as MessageEvent<CsvParseResponse>);
  }

  emitError(message: string): void {
    this.onerror?.({ message } as ErrorEvent);
  }
}

const mappingProfile = (
  overrides: Partial<Omit<MappingProfile, 'id'>> = {},
): Omit<MappingProfile, 'id'> => ({
  name: 'Custom mapping',
  delimiter: ';',
  decimalSeparator: ',',
  dateFormat: 'DD/MM/YYYY',
  encoding: 'utf-8',
  headerRows: 1,
  signConvention: 'as-is',
  columns: { date: 'Date', description: 'Desc' },
  ...overrides,
});

const setup = () => {
  FakeWorker.instances = [];
  vi.stubGlobal('Worker', FakeWorker);
  TestBed.configureTestingModule({});
  return { service: TestBed.inject(CsvImportService) };
};

describe('CsvImportService: parse posts raw bytes, not decoded text (TICKET-IMP-06)', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('transfers an ArrayBuffer + encoding to the worker instead of decoding on the main thread', async () => {
    const ctx = setup();
    const file = new File(['Date;Desc\n01/01/2026;x'], 'f.csv');

    const parsePromise = ctx.service.parse(file, mappingProfile());
    await vi.waitFor(() => expect(FakeWorker.instances).toHaveLength(1));
    const worker = FakeWorker.instances[0];
    await vi.waitFor(() => expect(worker.postedMessages).toHaveLength(1));

    const [posted] = worker.postedMessages;
    expect(posted.data.buffer).toBeInstanceOf(ArrayBuffer);
    expect((posted.data as { fileText?: unknown }).fileText).toBeUndefined();
    expect(posted.data.encoding).toBe('utf-8');
    // Requested as a transferable, and the transfer actually detaches it on the main thread.
    expect(posted.transfer).toEqual([posted.data.buffer]);
    expect(posted.data.buffer.byteLength).toBe(0);

    worker.emitMessage({ headers: ['Date', 'Desc'], rows: [], warnings: [] });
    await expect(parsePromise).resolves.toEqual({
      headers: ['Date', 'Desc'],
      rows: [],
      warnings: [],
    });
    expect(worker.terminated).toBe(true);
  });

  it('rejects and terminates the worker on a worker error', async () => {
    const ctx = setup();
    const file = new File(['Date;Desc\n01/01/2026;x'], 'f.csv');

    const parsePromise = ctx.service.parse(file, mappingProfile());
    await vi.waitFor(() => expect(FakeWorker.instances).toHaveLength(1));
    const worker = FakeWorker.instances[0];

    worker.emitError('boom');

    await expect(parsePromise).rejects.toThrow('boom');
    expect(worker.terminated).toBe(true);
  });
});

describe('CsvImportService: detectHeaders / previewRawRows read a sliced head, cached per (File, encoding) (TICKET-IMP-06)', () => {
  it('detects headers from a file much larger than the head slice', async () => {
    const ctx = setup();
    const rows = [
      'Date;Desc;Amount',
      ...Array.from({ length: 5000 }, (_, i) => `2026-01-01;row ${i};-1,00`),
    ];
    const file = new File([rows.join('\n')], 'big.csv');
    expect(file.size).toBeGreaterThan(64 * 1024);

    const headers = await ctx.service.detectHeaders(file, ';', 'utf-8');

    expect(headers).toEqual(['Date', 'Desc', 'Amount']);
  });

  it('previews rows from a file much larger than the head slice', async () => {
    const ctx = setup();
    const rows = [
      'Date;Desc;Amount',
      ...Array.from({ length: 5000 }, (_, i) => `2026-01-01;row ${i};-1,00`),
    ];
    const file = new File([rows.join('\n')], 'big.csv');

    const preview = await ctx.service.previewRawRows(file, ';', 'utf-8', 3);

    expect(preview).toEqual([
      ['Date', 'Desc', 'Amount'],
      ['2026-01-01', 'row 0', '-1,00'],
      ['2026-01-01', 'row 1', '-1,00'],
    ]);
  });

  it('does not drop the last row when the file size lands exactly on the slice boundary', async () => {
    const ctx = setup();
    const header = 'Date;Desc;Amount\n';
    const rowPrefix = '2026-01-01;last row';
    const rowSuffix = ';-1,00';
    const padding = 'x'.repeat(64 * 1024 - (header.length + rowPrefix.length + rowSuffix.length));
    const file = new File([header + rowPrefix + padding + rowSuffix], 'exact.csv');
    expect(file.size).toBe(64 * 1024);

    const preview = await ctx.service.previewRawRows(file, ';', 'utf-8', 2);

    expect(preview).toEqual([
      ['Date', 'Desc', 'Amount'],
      ['2026-01-01', `last row${padding}`, '-1,00'],
    ]);
  });

  it('caches the decoded head so a second detectHeaders call with the same file+encoding does not re-slice the file', async () => {
    const ctx = setup();
    const file = new File(['Date;Desc\n01/01/2026;x'], 'f.csv');
    const sliceSpy = vi.spyOn(file, 'slice');

    await ctx.service.detectHeaders(file, ';', 'utf-8');
    await ctx.service.detectHeaders(file, ';', 'utf-8');

    expect(sliceSpy).toHaveBeenCalledTimes(1);
  });

  it('a changed encoding is a cache miss and re-slices the file', async () => {
    const ctx = setup();
    const file = new File(['Date;Desc\n01/01/2026;x'], 'f.csv');
    const sliceSpy = vi.spyOn(file, 'slice');

    await ctx.service.detectHeaders(file, ';', 'utf-8');
    await ctx.service.detectHeaders(file, ';', 'windows-1252');

    expect(sliceSpy).toHaveBeenCalledTimes(2);
  });

  it('previewRawRows reuses detectHeaders’ cached head for the same file+encoding', async () => {
    const ctx = setup();
    const file = new File(['Date;Desc\n01/01/2026;x'], 'f.csv');
    const sliceSpy = vi.spyOn(file, 'slice');

    await ctx.service.detectHeaders(file, ';', 'utf-8');
    await ctx.service.previewRawRows(file, ';', 'utf-8');

    expect(sliceSpy).toHaveBeenCalledTimes(1);
  });
});
