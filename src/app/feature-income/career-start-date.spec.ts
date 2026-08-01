import { clampRangeToCareerStart, validateCareerStartDate } from './career-start-date';

const FULL_HISTORY = { from: '2019-03-14', to: '2026-08-01' };

describe('clampRangeToCareerStart (FR-INC-12, TICKET-INC-12)', () => {
  it('leaves the range untouched when no career start date is set', () => {
    expect(clampRangeToCareerStart(FULL_HISTORY, undefined)).toBe(FULL_HISTORY);
  });

  it('leaves the range untouched for an empty string, which is how the control reports "cleared"', () => {
    expect(clampRangeToCareerStart(FULL_HISTORY, '')).toBe(FULL_HISTORY);
  });

  it('moves the start to the career start date when it falls after the data begins', () => {
    expect(clampRangeToCareerStart(FULL_HISTORY, '2022-06-01')).toEqual({
      from: '2022-06-01',
      to: '2026-08-01',
    });
  });

  it('never widens the range: a career start before the data begins changes nothing', () => {
    expect(clampRangeToCareerStart(FULL_HISTORY, '2015-01-01')).toBe(FULL_HISTORY);
  });

  it('changes nothing when the career start is exactly where the data begins', () => {
    expect(clampRangeToCareerStart(FULL_HISTORY, '2019-03-14')).toBe(FULL_HISTORY);
  });

  it('never touches the end of the range', () => {
    expect(clampRangeToCareerStart(FULL_HISTORY, '2025-12-31').to).toBe('2026-08-01');
  });
});

describe('validateCareerStartDate (FR-INC-12, TICKET-INC-12)', () => {
  const TODAY = '2026-08-01';
  const LAST_TRANSACTION = '2026-07-20';

  it('accepts a date inside the data span', () => {
    expect(validateCareerStartDate('2022-06-01', TODAY, LAST_TRANSACTION)).toBeNull();
  });

  it('accepts an empty value — that is how the setting is cleared, not a rejection', () => {
    expect(validateCareerStartDate('', TODAY, LAST_TRANSACTION)).toBeNull();
  });

  it('rejects a date in the future', () => {
    expect(validateCareerStartDate('2027-01-01', TODAY, LAST_TRANSACTION)).toMatch(
      /hasn't happened yet/,
    );
  });

  it('rejects today + 1, the nearest future date', () => {
    expect(validateCareerStartDate('2026-08-02', TODAY, LAST_TRANSACTION)).not.toBeNull();
  });

  it('accepts today itself', () => {
    expect(validateCareerStartDate(TODAY, TODAY, undefined)).toBeNull();
  });

  it('rejects a past date that sits after the last transaction, with its own reason', () => {
    expect(validateCareerStartDate('2026-07-25', TODAY, LAST_TRANSACTION)).toMatch(
      /after your most recent transaction/,
    );
  });

  it('accepts the last transaction date itself', () => {
    expect(validateCareerStartDate(LAST_TRANSACTION, TODAY, LAST_TRANSACTION)).toBeNull();
  });

  it('falls back to today as the only bound when there are no transactions', () => {
    expect(validateCareerStartDate('2026-07-25', TODAY, undefined)).toBeNull();
    expect(validateCareerStartDate('2026-09-01', TODAY, undefined)).not.toBeNull();
  });
});
