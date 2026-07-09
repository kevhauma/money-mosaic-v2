import type { Account } from '@/core/data-access';
import { coOwnerIbanSet, resolveCoOwnerByIban } from './joint-owner-lookup';

const account = (): Account => ({
  name: 'Joint',
  type: 'joint',
  currency: 'EUR',
  openingBalance: 0,
  openingBalanceDate: '2026-01-01',
  color: '#fff',
  icon: 'users',
  archived: false,
  coOwners: [
    { name: 'Partner', ibans: ['BE71 0961 2345 6769', 'BE68539007547034'] },
    { name: 'Parent', ibans: ['BE62510007547061'] },
  ],
});

describe('resolveCoOwnerByIban', () => {
  it('resolves the right co-owner for any of their registered IBANs, ignoring formatting', () => {
    expect(resolveCoOwnerByIban(account(), 'be7109612345 6769')?.name).toBe('Partner');
    expect(resolveCoOwnerByIban(account(), 'BE68539007547034')?.name).toBe('Partner');
    expect(resolveCoOwnerByIban(account(), 'BE62510007547061')?.name).toBe('Parent');
  });

  it('returns undefined for an unregistered or missing IBAN', () => {
    expect(resolveCoOwnerByIban(account(), 'BE00000000000000')).toBeUndefined();
    expect(resolveCoOwnerByIban(account(), undefined)).toBeUndefined();
  });

  it('returns undefined when the account has no co-owners', () => {
    expect(
      resolveCoOwnerByIban({ ...account(), coOwners: undefined }, 'BE62510007547061'),
    ).toBeUndefined();
  });
});

describe('coOwnerIbanSet', () => {
  it('returns the flat, normalised set of every co-owner IBAN', () => {
    expect(coOwnerIbanSet(account())).toEqual(
      new Set(['BE71096123456769', 'BE68539007547034', 'BE62510007547061']),
    );
  });

  it('returns an empty set when there are no co-owners', () => {
    expect(coOwnerIbanSet({ ...account(), coOwners: undefined })).toEqual(new Set());
  });
});
