import {
  duplicateAlertStatus,
  duplicateScanSummary,
  duplicatesToggleLabel,
  EMPTY_DUPLICATE_SCAN,
} from './duplicate-scan';

describe('duplicateScanSummary (TICKET-IMP-14)', () => {
  it('says everything is new when nothing is recognised', () => {
    expect(duplicateScanSummary(3, 0, 'skip')).toBe(
      'All 3 rows are new — none of them is already in this account.',
    );
  });

  it('states both counts, and what will happen to the recognised ones, under skip', () => {
    expect(duplicateScanSummary(1, 2, 'skip')).toBe(
      '1 row new, 2 already in this account — those will be skipped.',
    );
  });

  it('does the arithmetic for the reader under import-anyway, rather than leaving it to them', () => {
    // The ticket's promise is that the counts shown are the counts that happen; under this choice
    // the recognised rows are added too, so the sentence has to say so.
    expect(duplicateScanSummary(1, 2, 'import')).toBe(
      '1 row new plus 2 already in this account — all 3 will be added.',
    );
  });

  it('pluralises the new-row count', () => {
    expect(duplicateScanSummary(1, 1, 'skip')).toContain('1 row new');
    expect(duplicateScanSummary(2, 1, 'skip')).toContain('2 rows new');
  });
});

describe('duplicatesToggleLabel (TICKET-IMP-14)', () => {
  it('pluralises, so a single duplicate does not read "1 rows"', () => {
    expect(duplicatesToggleLabel(1, false)).toBe('Show the 1 row already imported');
    expect(duplicatesToggleLabel(4, false)).toBe('Show the 4 rows already imported');
  });

  it('offers the way back out while the filter is on', () => {
    expect(duplicatesToggleLabel(4, true)).toBe('Show all rows');
  });
});

describe('duplicateAlertStatus (TICKET-IMP-14)', () => {
  it('warns only when there is something to decide', () => {
    expect(duplicateAlertStatus(0)).toBe('info');
    expect(duplicateAlertStatus(1)).toBe('warning');
  });
});

describe('EMPTY_DUPLICATE_SCAN (TICKET-IMP-14)', () => {
  it('claims nothing before the scan has run', () => {
    // "0 already imported" and "not checked yet" are different claims, and only one of them is
    // true on first paint.
    expect(EMPTY_DUPLICATE_SCAN.known).toBe(false);
    expect(EMPTY_DUPLICATE_SCAN.summary).toBeNull();
    expect(EMPTY_DUPLICATE_SCAN.rows.size).toBe(0);
  });
});
