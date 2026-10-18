import type { MappingProfile, MappingProfileColumns, SignConvention } from '@/core/data-access';

export type ImportMappingResult = { mappingProfile: Omit<MappingProfile, 'id'> };

export const SIGN_CONVENTION_LABELS: Record<SignConvention, string> = {
  'as-is': 'As-is',
  'debit-negative': 'Debit negative (default)',
  'credit-negative': 'Credit negative',
};

/** A column-mapping field's key — one of `MappingProfileColumns`'s own properties. */
export type ColumnFieldKey = keyof MappingProfileColumns;

/** `reason` is what an optional field buys, said where the user decides whether to map it. */
export type ColumnFieldDef = { key: ColumnFieldKey; label: string; reason?: string };

/** The nine columns in the order the Columns section lists them (TICKET-IMP-17). */
export const COLUMN_FIELD_DEFS: ColumnFieldDef[] = [
  { key: 'date', label: 'Date' },
  { key: 'amount', label: 'Amount' },
  { key: 'debit', label: 'Money out' },
  { key: 'credit', label: 'Money in' },
  { key: 'description', label: 'Description' },
  {
    key: 'counterpartyName',
    label: 'Who it was with',
    reason: 'Lets rules recognise who you paid.',
  },
  {
    key: 'counterpartyIban',
    label: 'Their IBAN',
    reason: 'Finds transfers between your own accounts.',
  },
  { key: 'ownIban', label: 'Your IBAN', reason: 'Tells which account the file belongs to.' },
  {
    key: 'balance',
    label: 'Running balance',
    reason: 'Sets a new account’s opening balance.',
  },
];

/** The column-field controls of the mapping form's raw value. `Partial` because Angular's typed
 * reactive forms widen a `FormGroup`'s `valueChanges` emission to "any control could be disabled",
 * so `toSignal(form.valueChanges, ...)` infers a value that may omit any key even though none of
 * this form's controls are ever actually disabled. */
export type ColumnMappingFormValue = Partial<Record<ColumnFieldKey, string>>;

const labelOf = (key: ColumnFieldKey): string =>
  COLUMN_FIELD_DEFS.find((field) => field.key === key)!.label;

/** Non-blocking "Also used for X" for any two fields sharing one source column (TICKET-IMP-07). */
export function duplicateWarnings(
  value: ColumnMappingFormValue,
): Partial<Record<ColumnFieldKey, string>> {
  const fieldsByColumn = new Map<string, ColumnFieldKey[]>();
  for (const field of COLUMN_FIELD_DEFS) {
    const columnName = value[field.key];
    if (!columnName) continue;
    fieldsByColumn.set(columnName, [...(fieldsByColumn.get(columnName) ?? []), field.key]);
  }

  const warnings: Partial<Record<ColumnFieldKey, string>> = {};
  for (const keys of fieldsByColumn.values()) {
    if (keys.length < 2) continue;
    for (const key of keys) {
      const others = keys.filter((other) => other !== key).map(labelOf);
      warnings[key] = `Also used for ${others.join(', ')}`;
    }
  }
  return warnings;
}
