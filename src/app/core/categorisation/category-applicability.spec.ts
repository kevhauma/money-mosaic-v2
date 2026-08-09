import type { Category } from '@/core/data-access';
import {
  categoryAppliesOn,
  categoryHasEnded,
  categoryOverlapsRange,
  withEndedSuffix,
} from './category-applicability';

const category = (overrides: Partial<Category> = {}): Category => ({
  id: 1,
  name: 'Rent',
  kind: 'expense',
  color: '#7F77DD',
  icon: 'tag',
  archived: false,
  isSystem: false,
  ...overrides,
});

describe('categoryHasEnded (TICKET-CAT-10)', () => {
  it('is false without an end date, however old the category', () => {
    expect(categoryHasEnded(category(), '2099-12-31')).toBe(false);
    expect(categoryHasEnded(category({ activeFrom: '2020-01-01' }), '2099-12-31')).toBe(false);
  });

  it('is true only once the end date is behind the given day', () => {
    const rent = category({ activeUntil: '2023-06-30' });

    expect(categoryHasEnded(rent, '2023-06-29')).toBe(false);
    // Still applies on its final day, by the inclusive rule — so it has not ended yet.
    expect(categoryHasEnded(rent, '2023-06-30')).toBe(false);
    expect(categoryHasEnded(rent, '2023-07-01')).toBe(true);
  });

  it('is independent of archiving — two different axes', () => {
    expect(categoryHasEnded(category({ archived: true }), '2099-12-31')).toBe(false);
    expect(
      categoryHasEnded(category({ archived: false, activeUntil: '2020-01-01' }), '2024-01-01'),
    ).toBe(true);
  });
});

describe('categoryAppliesOn (TICKET-CAT-11)', () => {
  it('covers every date when the window is open at both ends', () => {
    expect(categoryAppliesOn(category(), '1999-01-01')).toBe(true);
    expect(categoryAppliesOn(category(), '2099-12-31')).toBe(true);
  });

  it('respects an open-ended start', () => {
    const rent = category({ activeUntil: '2023-06-30' });

    expect(categoryAppliesOn(rent, '1999-01-01')).toBe(true);
    expect(categoryAppliesOn(rent, '2023-07-01')).toBe(false);
  });

  it('respects an open-ended end', () => {
    const mortgage = category({ activeFrom: '2023-07-01' });

    expect(categoryAppliesOn(mortgage, '2023-06-30')).toBe(false);
    expect(categoryAppliesOn(mortgage, '2099-12-31')).toBe(true);
  });

  it('includes both edges of a closed window', () => {
    const childcare = category({ activeFrom: '2021-09-01', activeUntil: '2023-06-30' });

    expect(categoryAppliesOn(childcare, '2021-08-31')).toBe(false);
    expect(categoryAppliesOn(childcare, '2021-09-01')).toBe(true);
    expect(categoryAppliesOn(childcare, '2022-03-15')).toBe(true);
    expect(categoryAppliesOn(childcare, '2023-06-30')).toBe(true);
    expect(categoryAppliesOn(childcare, '2023-07-01')).toBe(false);
  });
});

describe('categoryOverlapsRange (TICKET-CAT-11)', () => {
  it('is true for a windowless category whatever the span', () => {
    expect(categoryOverlapsRange(category(), '1999-01-01', '2099-12-31')).toBe(true);
  });

  it('is true while any part of the window falls inside the span', () => {
    const childcare = category({ activeFrom: '2021-09-01', activeUntil: '2023-06-30' });

    expect(categoryOverlapsRange(childcare, '2022-01-01', '2022-12-31')).toBe(true); // span inside window
    expect(categoryOverlapsRange(childcare, '2019-01-01', '2029-12-31')).toBe(true); // window inside span
    expect(categoryOverlapsRange(childcare, '2020-01-01', '2021-09-30')).toBe(true); // overlaps the start
    expect(categoryOverlapsRange(childcare, '2023-06-01', '2024-01-01')).toBe(true); // overlaps the end
  });

  it('counts a single touching day as an overlap, matching the inclusive single-date rule', () => {
    const rent = category({ activeUntil: '2023-06-30' });

    expect(categoryOverlapsRange(rent, '2023-06-30', '2024-01-01')).toBe(true);
    expect(categoryOverlapsRange(rent, '2023-07-01', '2024-01-01')).toBe(false);
  });

  it('is false for a span entirely before the window', () => {
    const mortgage = category({ activeFrom: '2023-07-01' });

    expect(categoryOverlapsRange(mortgage, '2020-01-01', '2023-06-30')).toBe(false);
  });
});

describe('withEndedSuffix (TICKET-CAT-11)', () => {
  it('marks only a category that has already ended', () => {
    expect(withEndedSuffix('Rent', category({ activeUntil: '2023-06-30' }), '2024-01-01')).toBe(
      'Rent (ended)',
    );
    expect(withEndedSuffix('Rent', category({ activeUntil: '2023-06-30' }), '2023-06-30')).toBe(
      'Rent',
    );
    expect(withEndedSuffix('Rent', category(), '2099-12-31')).toBe('Rent');
  });
});
