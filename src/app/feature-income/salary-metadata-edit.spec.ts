import type { SalaryMetadata } from '@/core/data-access';
import { resolveSalaryMetadataWrite } from './salary-metadata-edit';

const stored = (overrides: Partial<SalaryMetadata> = {}): SalaryMetadata => ({
  id: 7,
  yearMonth: '2026-03',
  grossWage: 3500,
  ...overrides,
});

describe('resolveSalaryMetadataWrite: nothing changed (FR-INC-10)', () => {
  it('writes nothing when both cells still match the stored row', () => {
    const write = resolveSalaryMetadataWrite('2026-03', { grossWage: 3500, bonus: null }, stored());

    expect(write).toEqual({ kind: 'none' });
  });

  it('writes nothing when an empty month is blurred untouched', () => {
    // The common case: tabbing across a table of blank months must not create a single row.
    const write = resolveSalaryMetadataWrite(
      '2026-03',
      { grossWage: null, bonus: null },
      undefined,
    );

    expect(write).toEqual({ kind: 'none' });
  });

  it('writes nothing when both cells match a row that has a bonus too', () => {
    const write = resolveSalaryMetadataWrite(
      '2026-03',
      { grossWage: 3500, bonus: 1200 },
      stored({ bonus: 1200 }),
    );

    expect(write).toEqual({ kind: 'none' });
  });
});

describe('resolveSalaryMetadataWrite: creating and updating', () => {
  it('creates a row for a month that had none', () => {
    const write = resolveSalaryMetadataWrite(
      '2026-03',
      { grossWage: 3500, bonus: null },
      undefined,
    );

    expect(write).toEqual({
      kind: 'upsert',
      entry: { yearMonth: '2026-03', grossWage: 3500, bonus: undefined },
    });
  });

  it('creates a bonus-only row — gross wage is not required to note a bonus', () => {
    const write = resolveSalaryMetadataWrite('2026-03', { grossWage: null, bonus: 900 }, undefined);

    expect(write).toMatchObject({ kind: 'upsert', entry: { grossWage: undefined, bonus: 900 } });
  });

  it('keeps the existing row’s id, so an edit updates rather than duplicates', () => {
    const write = resolveSalaryMetadataWrite('2026-03', { grossWage: 3800, bonus: null }, stored());

    expect(write).toMatchObject({ kind: 'upsert', entry: { id: 7, grossWage: 3800 } });
  });

  it('keeps fields this table does not edit', () => {
    const write = resolveSalaryMetadataWrite(
      '2026-03',
      { grossWage: 3800, bonus: null },
      stored({ note: 'promotion' }),
    );

    expect(write).toMatchObject({ kind: 'upsert', entry: { note: 'promotion' } });
  });

  it('stores a real zero, which is a different claim from an empty cell', () => {
    const write = resolveSalaryMetadataWrite('2026-03', { grossWage: 0, bonus: null }, stored());

    expect(write).toMatchObject({ kind: 'upsert', entry: { grossWage: 0 } });
  });
});

describe('resolveSalaryMetadataWrite: clearing', () => {
  it('drops a single cleared field rather than persisting a zero', () => {
    const write = resolveSalaryMetadataWrite(
      '2026-03',
      { grossWage: 3500, bonus: null },
      stored({ bonus: 1200 }),
    );

    expect(write).toMatchObject({ kind: 'upsert', entry: { grossWage: 3500, bonus: undefined } });
  });

  it('removes the whole row once both cells are empty', () => {
    const write = resolveSalaryMetadataWrite(
      '2026-03',
      { grossWage: null, bonus: null },
      stored({ bonus: 1200 }),
    );

    expect(write).toEqual({ kind: 'remove', id: 7 });
  });

  it('writes nothing when clearing a row that was never persisted', () => {
    const write = resolveSalaryMetadataWrite(
      '2026-03',
      { grossWage: null, bonus: null },
      { yearMonth: '2026-03' },
    );

    expect(write).toEqual({ kind: 'none' });
  });
});
