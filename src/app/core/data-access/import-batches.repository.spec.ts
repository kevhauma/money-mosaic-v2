import { HttpTestingController } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { callApi, withApiTesting } from './api-client.testing';
import type { ImportBatch } from './entities';
import { ImportBatchesRepository } from './import-batches.repository';

const batch = { id: 6, accountId: 1, fileName: 'june.csv' } as ImportBatch;

describe('ImportBatchesRepository', () => {
  withApiTesting();

  const repository = (): ImportBatchesRepository => TestBed.inject(ImportBatchesRepository);

  it('getAll reads the list endpoint', async () => {
    expect(
      await callApi(() => repository().getAll(), { method: 'GET', url: '/api/importBatches' }, [
        batch,
      ]),
    ).toEqual([batch]);
  });

  it('getById reads the one row', async () => {
    expect(
      await callApi(
        () => repository().getById(6),
        { method: 'GET', url: '/api/importBatches/6' },
        batch,
      ),
    ).toEqual(batch);
  });

  it('getById resolves to undefined for a batch that is not there, as Dexie get() did', async () => {
    const settled = repository().getById(99);
    const request = TestBed.inject(HttpTestingController).expectOne('/api/importBatches/99');
    request.flush(
      { error: 'Not found', code: 'row_not_found' },
      { status: 404, statusText: 'Not Found' },
    );

    expect(await settled).toBeUndefined();
  });

  it('add posts the batch and resolves to the id the server assigned', async () => {
    expect(
      await callApi(
        () => repository().add(batch),
        { method: 'POST', url: '/api/importBatches', body: batch },
        { ...batch, id: 14 },
      ),
    ).toBe(14);
  });

  it('remove deletes the one row', async () => {
    await expect(
      callApi(() => repository().remove(6), { method: 'DELETE', url: '/api/importBatches/6' }),
    ).resolves.toBeUndefined();
  });
});
