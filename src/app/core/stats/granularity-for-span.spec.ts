import { pickGranularityForSpan } from './granularity-for-span';

describe('pickGranularityForSpan', () => {
  it('picks day for a short span', () => {
    expect(pickGranularityForSpan('2026-01-01', '2026-02-01')).toBe('day');
  });

  it('picks week for a medium span', () => {
    expect(pickGranularityForSpan('2026-01-01', '2027-01-01')).toBe('week');
  });

  it('picks month for a long span', () => {
    expect(pickGranularityForSpan('2020-01-01', '2024-01-01')).toBe('month');
  });

  it('picks quarter for a multi-year span', () => {
    expect(pickGranularityForSpan('2019-01-01', '2026-01-01')).toBe('quarter');
  });

  it('picks year for a decades-long span', () => {
    expect(pickGranularityForSpan('2000-01-01', '2026-01-01')).toBe('year');
  });

  it('stays inclusive at the day/week threshold boundary (120 days)', () => {
    expect(pickGranularityForSpan('2026-01-01', '2026-05-01')).toBe('day');
    expect(pickGranularityForSpan('2026-01-01', '2026-05-02')).toBe('week');
  });

  it('stays inclusive at the week/month threshold boundary (550 days)', () => {
    expect(pickGranularityForSpan('2026-01-01', '2027-07-05')).toBe('week');
    expect(pickGranularityForSpan('2026-01-01', '2027-07-06')).toBe('month');
  });

  it('stays inclusive at the month/quarter threshold boundary (1826 days)', () => {
    expect(pickGranularityForSpan('2020-01-01', '2024-12-31')).toBe('month');
    expect(pickGranularityForSpan('2020-01-01', '2025-01-01')).toBe('quarter');
  });

  it('stays inclusive at the quarter/year threshold boundary (3653 days)', () => {
    expect(pickGranularityForSpan('2016-01-01', '2026-01-01')).toBe('quarter');
    expect(pickGranularityForSpan('2016-01-01', '2026-01-02')).toBe('year');
  });
});
