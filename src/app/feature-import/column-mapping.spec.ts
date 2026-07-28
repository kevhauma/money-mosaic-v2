import {
  COLUMN_FIELD_DEFS,
  duplicateWarnings,
  invalidFieldLabels,
  resolvedSamples,
  summaryRows,
  type ColumnMappingFormValue,
} from './column-mapping';

const emptyValue = (): ColumnMappingFormValue => {
  const value = { headerRows: 1 } as ColumnMappingFormValue;
  for (const field of COLUMN_FIELD_DEFS) value[field.key] = '';
  return value;
};

const headers = ['Date', 'Desc', 'Amount', 'Balance'];
const previewRows = [
  headers,
  ['14/07/2026', 'Coffee', '-3.50', '120.00'],
  ['15/07/2026', 'Lunch', '-8.00', '112.00'],
];

describe('resolvedSamples', () => {
  it('is empty for an unmapped field', () => {
    expect(resolvedSamples(emptyValue(), headers, previewRows).date).toBeUndefined();
  });

  it('resolves the row after headerRows for a mapped simple field', () => {
    const value = { ...emptyValue(), date: 'Date' };
    expect(resolvedSamples(value, headers, previewRows).date).toBe('14/07/2026');
  });

  it('resolves an amount-mode field the same way as any other column-field kind', () => {
    const value = { ...emptyValue(), amount: 'Amount' };
    expect(resolvedSamples(value, headers, previewRows).amount).toBe('-3.50');
  });

  it('is undefined when the mapped column name is not present in headers', () => {
    const value = { ...emptyValue(), date: 'Missing Column' };
    expect(resolvedSamples(value, headers, previewRows).date).toBeUndefined();
  });
});

describe('duplicateWarnings', () => {
  it('flags both fields once they share a source column', () => {
    const value = { ...emptyValue(), date: 'Date', balance: 'Date' };
    const warnings = duplicateWarnings(value);
    expect(warnings.date).toContain('Running balance');
    expect(warnings.balance).toContain('Date');
  });

  it('is empty when no two fields share a column', () => {
    const value = { ...emptyValue(), date: 'Date', balance: 'Balance' };
    expect(duplicateWarnings(value)).toEqual({});
  });

  it('lists every other field sharing the column, not just one', () => {
    const value = { ...emptyValue(), date: 'Date', balance: 'Date', amount: 'Date' };
    expect(duplicateWarnings(value).date).toContain('Running balance');
    expect(duplicateWarnings(value).date).toContain('Amount');
  });
});

describe('invalidFieldLabels', () => {
  it('lists every unmapped required field', () => {
    expect(invalidFieldLabels(emptyValue())).toEqual(['Date', 'Description']);
  });

  it('is empty once every required field is mapped', () => {
    const value = { ...emptyValue(), date: 'Date', description: 'Desc' };
    expect(invalidFieldLabels(value)).toEqual([]);
  });

  it('never lists an optional field, however unmapped', () => {
    const value = { ...emptyValue(), date: 'Date', description: 'Desc' };
    expect(invalidFieldLabels(value)).not.toContain('Running balance');
  });
});

describe('summaryRows', () => {
  it('lists exactly the mapped fields, in COLUMN_FIELD_DEFS order, with column and sample', () => {
    const value = { ...emptyValue(), date: 'Date', balance: 'Amount' };
    expect(summaryRows(value, headers, previewRows)).toEqual([
      { label: 'Date', column: 'Date', sample: '14/07/2026' },
      { label: 'Running balance', column: 'Amount', sample: '-3.50' },
    ]);
  });

  it('is empty when nothing is mapped', () => {
    expect(summaryRows(emptyValue(), headers, previewRows)).toEqual([]);
  });
});
