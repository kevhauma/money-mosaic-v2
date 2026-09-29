import { TestBed } from '@angular/core/testing';
import { callApi, withApiTesting } from './api-client.testing';
import type { SalaryMetadata } from './entities';
import { SalaryMetadataRepository } from './salary-metadata.repository';

const entry = { id: 2, yearMonth: '2026-03', grossWage: 4000 } as SalaryMetadata;

describe('SalaryMetadataRepository', () => {
  withApiTesting();

  const repository = (): SalaryMetadataRepository => TestBed.inject(SalaryMetadataRepository);

  it('getAll reads the list endpoint', async () => {
    expect(
      await callApi(() => repository().getAll(), { method: 'GET', url: '/api/salaryMetadata' }, [
        entry,
      ]),
    ).toEqual([entry]);
  });

  /**
   * The look-up-by-month that used to happen here is the endpoint's, in one transaction: `PUT` is
   * keyed by `yearMonth`, so the caller says "this is March now" and the server decides whether that
   * is an insert or a replace. What this asserts is that the whole entry is sent to the upsert
   * endpoint and the stored row's id comes back.
   */
  it('upsert puts the whole month and resolves to the stored row id', async () => {
    expect(
      await callApi(
        () => repository().upsert(entry),
        { method: 'PUT', url: '/api/salaryMetadata', body: entry },
        { ...entry, id: 18 },
      ),
    ).toBe(18);
  });

  it('remove deletes the one row', async () => {
    await expect(
      callApi(() => repository().remove(2), { method: 'DELETE', url: '/api/salaryMetadata/2' }),
    ).resolves.toBeUndefined();
  });
});
