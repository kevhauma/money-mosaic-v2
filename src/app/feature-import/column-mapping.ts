import type { MappingProfile, MappingProfileColumns, SignConvention } from '@/core/data-access';

export type ImportMappingResult = { mappingProfile: Omit<MappingProfile, 'id'> };

export type MapperSummaryRow = { label: string; column: string; sample?: string };

export const SIGN_CONVENTION_LABELS: Record<SignConvention, string> = {
  'as-is': 'As-is',
  'debit-negative': 'Debit negative (default)',
  'credit-negative': 'Credit negative',
};

/** A column-mapping field's key — one of `MappingProfileColumns`'s own properties. */
export type ColumnFieldKey = keyof MappingProfileColumns;

export type ColumnFieldDef = { key: ColumnFieldKey; label: string; required: boolean };

/** Flat per-control definitions — `resolvedSamples`/`duplicateWarnings`/`invalidFieldLabels` still
 * operate at this 9-control granularity regardless of how the guided flow groups them into steps. */
export const COLUMN_FIELD_DEFS: ColumnFieldDef[] = [
  { key: 'date', label: 'Date', required: true },
  { key: 'amount', label: 'Amount', required: false },
  { key: 'debit', label: 'Debit', required: false },
  { key: 'credit', label: 'Credit', required: false },
  { key: 'description', label: 'Description', required: true },
  { key: 'counterpartyName', label: 'Counterparty name', required: false },
  { key: 'counterpartyIban', label: 'Counterparty IBAN', required: false },
  { key: 'ownIban', label: 'Own account number/IBAN', required: false },
  { key: 'balance', label: 'Running balance', required: false },
];

/** The subset of the mapping form's raw value the pure derivations below need: the header-row
 * offset plus every column-field control, keyed the same as `MappingProfileColumns`. Both are
 * `Partial` because Angular's typed reactive forms widen a `FormGroup`'s `valueChanges` emission
 * to "any control could be disabled," so `toSignal(form.valueChanges, ...)` infers a value that
 * may omit any key even though none of this form's controls are ever actually disabled. */
export type ColumnMappingFormValue = Partial<Record<ColumnFieldKey, string>> & {
  headerRows?: number;
};

/** The active step's live resolved sample(s) — the first data row's value for whichever column is
 * currently selected, per individual form control (TICKET-IMP-07; unchanged by the step regrouping). */
export function resolvedSamples(
  value: ColumnMappingFormValue,
  headers: string[],
  previewRows: string[][],
): Partial<Record<ColumnFieldKey, string>> {
  const sampleRow = previewRows[value.headerRows ?? 1] ?? [];
  const samples: Partial<Record<ColumnFieldKey, string>> = {};
  for (const field of COLUMN_FIELD_DEFS) {
    const columnName = value[field.key];
    const index = columnName ? headers.indexOf(columnName) : -1;
    if (index !== -1 && sampleRow[index] !== undefined) {
      samples[field.key] = sampleRow[index];
    }
  }
  return samples;
}

/** Non-blocking "also mapped to X" warning for any two fields sharing the same source column
 * (TICKET-IMP-07; unchanged by the step regrouping). */
export function duplicateWarnings(
  value: ColumnMappingFormValue,
): Partial<Record<ColumnFieldKey, string>> {
  const fieldsByColumn = new Map<string, ColumnFieldKey[]>();
  for (const field of COLUMN_FIELD_DEFS) {
    const columnName = value[field.key];
    if (!columnName) continue;
    const keys = fieldsByColumn.get(columnName) ?? [];
    keys.push(field.key);
    fieldsByColumn.set(columnName, keys);
  }

  const warnings: Partial<Record<ColumnFieldKey, string>> = {};
  for (const keys of fieldsByColumn.values()) {
    if (keys.length < 2) continue;
    for (const key of keys) {
      const otherLabels = keys
        .filter((other) => other !== key)
        .map((other) => COLUMN_FIELD_DEFS.find((field) => field.key === other)!.label);
      warnings[key] = `Also mapped to ${otherLabels.join(', ')}`;
    }
  }
  return warnings;
}

/** Required column fields still unmapped — surfaced so the wizard's Confirm/Next button can name
 * what's blocking it (TICKET-IMP-07; unchanged by the step regrouping). */
export function invalidFieldLabels(value: ColumnMappingFormValue): string[] {
  return COLUMN_FIELD_DEFS.filter((field) => field.required && !value[field.key]).map(
    (field) => field.label,
  );
}

/** The Summary step's recap — every field that's actually mapped, in `COLUMN_FIELD_DEFS` order. */
export function summaryRows(
  value: ColumnMappingFormValue,
  headers: string[],
  previewRows: string[][],
): MapperSummaryRow[] {
  const samples = resolvedSamples(value, headers, previewRows);
  const rows: MapperSummaryRow[] = [];
  for (const field of COLUMN_FIELD_DEFS) {
    const column = value[field.key];
    if (!column) continue;
    rows.push({ label: field.label, column, sample: samples[field.key] });
  }
  return rows;
}
