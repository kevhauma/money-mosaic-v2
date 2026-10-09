import { HttpTestingController } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { callApi, untilRequested, withApiTesting } from './api-client.testing';
import {
  DataManagementRepository,
  type AppDataExport,
  type ImportMode,
} from './data-management.repository';

const document = (): AppDataExport => ({
  schemaVersion: 16,
  exportedAt: '2026-07-01T00:00:00.000Z',
  tables: { accounts: [{ id: 1, name: 'Checking' }], transactions: [] },
});

describe('DataManagementRepository', () => {
  withApiTesting();

  const repository = (): DataManagementRepository => TestBed.inject(DataManagementRepository);

  it('exportAll reads the whole-dataset export', async () => {
    expect(
      await callApi(
        () => repository().exportAll(),
        { method: 'GET', url: '/api/data/export' },
        document(),
      ),
    ).toEqual(document());
  });

  const UPLOAD_ID = 'a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6';

  /**
   * `importAll` is the one repository method that makes two requests (TICKET-SRV-11), so it cannot
   * go through `callApi`. This drives both halves: the document is staged as bytes, then the id it
   * answered with is applied. `apply` is returned rather than flushed, so a case can fail that half
   * — which is where every refusal the user reads comes from.
   */
  const stageImport = async (
    data: AppDataExport,
    mode: ImportMode,
  ): Promise<{
    settled: Promise<void>;
    staged: Blob;
    apply: ReturnType<HttpTestingController['expectOne']>;
  }> => {
    const http = TestBed.inject(HttpTestingController);
    const settled = repository().importAll(data, mode);

    const staged = http.expectOne('/api/data/import/staged');
    expect(staged.request.method).toBe('POST');
    // Bytes, not JSON: the whole point is that the server never runs this through `express.json()`.
    expect(staged.request.headers.get('Content-Type')).toBe('application/octet-stream');
    const body = staged.request.body as Blob;
    staged.flush({ uploadId: UPLOAD_ID } as never);

    await untilRequested();

    const apply = http.expectOne('/api/data/import');
    expect(apply.request.method).toBe('POST');
    expect(apply.request.body).toEqual({ mode, uploadId: UPLOAD_ID });

    return { settled, staged: body, apply };
  };

  it.each(['replace', 'merge'] as const)(
    'importAll stages the document and applies it in %s mode',
    async (mode) => {
      const { settled, staged, apply } = await stageImport(document(), mode);
      apply.flush(null);

      await expect(settled).resolves.toBeUndefined();
      // The staged bytes are the document itself, unreshaped — what `GET /export` produced and what
      // a backup file on disk contains.
      expect(JSON.parse(await staged.text())).toEqual(document());
    },
  );

  /**
   * The `schemaVersion` guard moved to the side that now owns the schema (TICKET-SRV-04): it runs
   * before the transaction opens, so nothing is written, and its sentence is what the user is shown.
   * Since TICKET-SRV-11 it runs against the *staged* document, so the refusal arrives on the apply
   * request — the sentence the dialog shows has to survive that move.
   */
  it('rejects a backup from a newer schema with the server sentence, having written nothing', async () => {
    const { settled, apply } = await stageImport({ ...document(), schemaVersion: 99 }, 'merge');

    apply.flush(
      {
        error:
          'This backup was created with a newer database schema (v99) than this server supports (v16). Update the server before importing.',
      } as never,
      { status: 400, statusText: 'Bad Request' },
    );

    await expect(settled).rejects.toThrow('newer database schema (v99)');
  });

  it('deleteAll clears the signed-in user rows', async () => {
    await expect(
      callApi(() => repository().deleteAll(), { method: 'DELETE', url: '/api/data' }),
    ).resolves.toBeUndefined();
  });
});
