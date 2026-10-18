import { duplicateWarnings } from './column-mapping';

describe('duplicateWarnings', () => {
  it('is empty when every mapped field uses its own column', () => {
    expect(duplicateWarnings({ date: 'Date', description: 'Desc', amount: 'Amount' })).toEqual({});
  });

  it('flags both fields once they share a source column', () => {
    expect(
      duplicateWarnings({ date: 'Date', description: 'Desc', counterpartyName: 'Desc' }),
    ).toEqual({
      description: 'Also used for Who it was with',
      counterpartyName: 'Also used for Description',
    });
  });

  it('names every other field when three share one column', () => {
    const warnings = duplicateWarnings({ amount: 'X', debit: 'X', credit: 'X' });
    expect(warnings.amount).toBe('Also used for Money out, Money in');
  });

  it('ignores unmapped fields', () => {
    expect(duplicateWarnings({ date: '', description: '' })).toEqual({});
  });
});
