import { partitionByFingerprint } from './import.service';

describe('partitionByFingerprint: dedupe partitioning', () => {
  it('skips a row whose (occurrence-keyed) fingerprint already exists in the account history', () => {
    const rows = [{ fingerprint: 'aaa' }, { fingerprint: 'bbb' }];
    const { accepted, duplicateCount } = partitionByFingerprint(rows, new Set(['aaa|1']));
    expect(accepted).toEqual([{ fingerprint: 'bbb|1' }]);
    expect(duplicateCount).toBe(1);
  });

  it('keeps two identical in-batch rows when neither is pre-existing, keyed by occurrence (FR-IMP-6)', () => {
    const rows = [{ fingerprint: 'same' }, { fingerprint: 'same' }];
    const { accepted, duplicateCount } = partitionByFingerprint(rows, new Set());
    expect(accepted).toEqual([{ fingerprint: 'same|1' }, { fingerprint: 'same|2' }]);
    expect(duplicateCount).toBe(0);
  });

  it('correctly partitions a mixed batch of pre-existing dupes, new rows, and in-batch repeats', () => {
    const rows = [
      { fingerprint: 'existing' },
      { fingerprint: 'new-1' },
      { fingerprint: 'repeat' },
      { fingerprint: 'repeat' },
    ];
    const { accepted, duplicateCount } = partitionByFingerprint(rows, new Set(['existing|1']));
    expect(accepted).toEqual([
      { fingerprint: 'new-1|1' },
      { fingerprint: 'repeat|1' },
      { fingerprint: 'repeat|2' },
    ]);
    expect(duplicateCount).toBe(1);
  });

  it('is idempotent: re-importing an identical file adds nothing (CR-1.2)', () => {
    const rows = [{ fingerprint: 'same' }, { fingerprint: 'same' }];
    const { accepted, duplicateCount } = partitionByFingerprint(
      rows,
      new Set(['same|1', 'same|2']),
    );
    expect(accepted).toEqual([]);
    expect(duplicateCount).toBe(2);
  });

  it('keeps a genuinely new n-th occurrence when an overlapping file re-imports earlier ones (CR-1.2)', () => {
    // One occurrence already stored; a later file carries two identical rows — the first matches the
    // stored occurrence and is dropped, the second is a legitimate new same-day transaction.
    const rows = [{ fingerprint: 'same' }, { fingerprint: 'same' }];
    const { accepted, duplicateCount } = partitionByFingerprint(rows, new Set(['same|1']));
    expect(accepted).toEqual([{ fingerprint: 'same|2' }]);
    expect(duplicateCount).toBe(1);
  });
});
