import { appDb } from './app-db';
import { SalaryMetadataRepository } from './salary-metadata.repository';

describe('SalaryMetadataRepository (FR-INC-10, TICKET-INC-10)', () => {
  const repository = new SalaryMetadataRepository();

  // fake-indexeddb is a process-wide singleton and Vitest runs with isolate:false, so rows written
  // here would otherwise leak into other spec files.
  afterEach(async () => {
    await appDb.salaryMetadata.clear();
  });

  it('stores a month’s gross wage and bonus', async () => {
    await repository.upsert({ yearMonth: '2026-03', grossWage: 3500, bonus: 900 });

    expect(await repository.getAll()).toEqual([
      { id: expect.any(Number), yearMonth: '2026-03', grossWage: 3500, bonus: 900 },
    ]);
  });

  it('updates the existing row rather than adding a second one for the same month', async () => {
    await repository.upsert({ yearMonth: '2026-03', grossWage: 3500 });
    await repository.upsert({ yearMonth: '2026-03', grossWage: 3800 });

    const rows = await repository.getAll();
    expect(rows).toHaveLength(1);
    expect(rows[0].grossWage).toBe(3800);
  });

  it('keeps the row’s id stable across an update, so references to it stay valid', async () => {
    await repository.upsert({ yearMonth: '2026-03', grossWage: 3500 });
    const [first] = await repository.getAll();

    await repository.upsert({ yearMonth: '2026-03', grossWage: 3800 });
    const [second] = await repository.getAll();

    expect(second.id).toBe(first.id);
  });

  it('keeps months apart', async () => {
    await repository.upsert({ yearMonth: '2026-03', grossWage: 3500 });
    await repository.upsert({ yearMonth: '2026-04', grossWage: 3600 });

    expect((await repository.getAll()).map((row) => row.yearMonth).sort()).toEqual([
      '2026-03',
      '2026-04',
    ]);
  });

  it('rejects a raw duplicate insert — the uniqueness lives in the schema, not only in upsert', async () => {
    await appDb.salaryMetadata.add({ yearMonth: '2026-03', grossWage: 3500 });

    await expect(
      appDb.salaryMetadata.add({ yearMonth: '2026-03', grossWage: 9999 }),
    ).rejects.toThrow();
  });

  it('removes a row by id', async () => {
    await repository.upsert({ yearMonth: '2026-03', grossWage: 3500 });
    const [row] = await repository.getAll();

    await repository.remove(row.id!);

    expect(await repository.getAll()).toEqual([]);
  });
});
