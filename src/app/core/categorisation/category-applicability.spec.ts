import type { Category } from '@/core/data-access';
import { categoryHasEnded } from './category-applicability';

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
