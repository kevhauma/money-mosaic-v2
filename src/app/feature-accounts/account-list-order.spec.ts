import type { Account } from '@/core/data-access';
import { accountDisplayOrder, storeDirectionFor } from './account-list-order';

const account = (id: number, name: string, archived = false): Account => ({
  id,
  name,
  type: 'checking',
  currency: 'EUR',
  openingBalance: 0,
  openingBalanceDate: '2026-01-01',
  color: '#3366ff',
  icon: 'wallet',
  archived,
});

describe('accountDisplayOrder (TICKET-ACC-09)', () => {
  const active = [account(1, 'Checking'), account(2, 'Savings'), account(3, 'Credit line')];

  it("reverses the chart's series order, so the first card is the topmost band", () => {
    // The chart builds one stacked series per `activeAccounts()` entry, and echarts draws series[0]
    // as the *bottom* band — so the stack read downwards is this array reversed.
    expect(accountDisplayOrder(active, [], false).map((a) => a.name)).toEqual([
      'Credit line',
      'Savings',
      'Checking',
    ]);
  });

  it('leaves archived accounts out entirely while the toggle is off', () => {
    const archived = [account(9, 'Old joint', true)];

    expect(accountDisplayOrder(active, archived, false).map((a) => a.id)).toEqual([3, 2, 1]);
  });

  it('appends archived accounts after every active one when the toggle is on', () => {
    const archived = [account(8, 'Old current', true), account(9, 'Old joint', true)];

    const names = accountDisplayOrder(active, archived, true).map((a) => a.name);

    expect(names.slice(0, 3)).toEqual(['Credit line', 'Savings', 'Checking']);
    // No band to align with, so they break cleanly at the bottom rather than interleaving.
    expect(names.slice(3)).toEqual(['Old joint', 'Old current']);
  });

  it('copies rather than reversing the caller’s array in place', () => {
    const input = [...active];

    accountDisplayOrder(input, [], false);

    expect(input.map((a) => a.id)).toEqual([1, 2, 3]);
  });

  it('handles an empty list', () => {
    expect(accountDisplayOrder([], [], true)).toEqual([]);
  });
});

describe('storeDirectionFor (TICKET-ACC-09)', () => {
  it('flips a visual direction into the store direction that moves the band the same way', () => {
    // The rendered list is the reverse of the store order, so moving up the screen is moving later
    // in the store. Passing 'up' through unchanged would move the card up and its band down.
    expect(storeDirectionFor('up')).toBe('down');
    expect(storeDirectionFor('down')).toBe('up');
  });
});
