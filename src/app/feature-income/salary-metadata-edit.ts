import type { SalaryMetadata } from '@/core/data-access';

/** What the two cells of one month's row currently hold — `null` for an empty cell, which is not the same as a zero. */
export type SalaryMetadataEdit = { grossWage: number | null; bonus: number | null };

/**
 * What blurring a cell should do to storage: usually nothing. `'remove'` carries the id of the row
 * to delete, `'upsert'` the row to write.
 */
export type SalaryMetadataWrite =
  { kind: 'none' } | { kind: 'remove'; id: number } | { kind: 'upsert'; entry: SalaryMetadata };

const sameAmount = (edited: number | null, stored: number | undefined): boolean =>
  (edited ?? undefined) === stored;

/**
 * Decides what one row's blur means (FR-INC-10, TICKET-INC-10). Kept pure and separate from the
 * table component so the three cases that matter are testable directly:
 *
 * - **Nothing changed** — the overwhelmingly common one. Tabbing across a table of empty months
 *   fires a blur per cell, and none of them may create an empty-but-persisted row.
 * - **Both cells cleared** — the row is deleted rather than kept as a pair of zeros. An amount of
 *   `0` is a real, different claim ("I earned nothing") from an empty cell ("I haven't said").
 * - **Anything else** — upsert, keeping the existing row's `id` and any field this table doesn't
 *   edit (`note`), so a partial edit can't silently drop data the user entered elsewhere.
 */
export const resolveSalaryMetadataWrite = (
  yearMonth: string,
  edit: SalaryMetadataEdit,
  existing: SalaryMetadata | undefined,
): SalaryMetadataWrite => {
  if (sameAmount(edit.grossWage, existing?.grossWage) && sameAmount(edit.bonus, existing?.bonus)) {
    return { kind: 'none' };
  }

  if (edit.grossWage === null && edit.bonus === null) {
    return existing?.id === undefined ? { kind: 'none' } : { kind: 'remove', id: existing.id };
  }

  return {
    kind: 'upsert',
    entry: {
      ...existing,
      yearMonth,
      grossWage: edit.grossWage ?? undefined,
      bonus: edit.bonus ?? undefined,
    },
  };
};
