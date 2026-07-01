import { partitionByFingerprint } from './import.service';

describe('partitionByFingerprint: dedupe partitioning', () => {
  it('skips a row whose fingerprint already exists in the account history', () => {
    const rows = [{ fingerprint: 'aaa' }, { fingerprint: 'bbb' }];
    const { accepted, duplicateCount } = partitionByFingerprint(rows, new Set(['aaa']));
    expect(accepted).toEqual([{ fingerprint: 'bbb' }]);
    expect(duplicateCount).toBe(1);
  });

  it('keeps two identical in-batch rows when neither is pre-existing (FR-IMP-6)', () => {
    const rows = [{ fingerprint: 'same' }, { fingerprint: 'same' }];
    const { accepted, duplicateCount } = partitionByFingerprint(rows, new Set());
    expect(accepted).toEqual(rows);
    expect(duplicateCount).toBe(0);
  });

  it('correctly partitions a mixed batch of pre-existing dupes, new rows, and in-batch repeats', () => {
    const rows = [
      { fingerprint: 'existing' },
      { fingerprint: 'new-1' },
      { fingerprint: 'repeat' },
      { fingerprint: 'repeat' },
    ];
    const { accepted, duplicateCount } = partitionByFingerprint(rows, new Set(['existing']));
    expect(accepted).toEqual([
      { fingerprint: 'new-1' },
      { fingerprint: 'repeat' },
      { fingerprint: 'repeat' },
    ]);
    expect(duplicateCount).toBe(1);
  });
});
