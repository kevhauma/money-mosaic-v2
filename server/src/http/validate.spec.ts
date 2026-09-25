import { describe, expect, it } from 'vitest';

import type { HttpError } from '../middleware/error-handler.js';
import { accounts } from '../schema/accounts.js';
import { salaryMetadata } from '../schema/salary-metadata.js';
import { transactions } from '../schema/transactions.js';
import { asReplacement, parseEntityBody, parseIdQuery, toId } from './validate.js';

/**
 * The boundary checks, at the unit level. `entity-router.spec.ts` proves a bad body is a 400 that
 * writes nothing; this proves *which* 400, since "names the offending field" is the whole value of
 * the check — a refactor that breaks a column name should read as that column's name, not as
 * "invalid request".
 */

const VALID_ACCOUNT = {
  name: 'Checking',
  type: 'checking',
  currency: 'EUR',
  openingBalance: 100,
  openingBalanceDate: '2026-01-01',
  color: '#0ea5e9',
  icon: 'bank',
  archived: false,
};

/** The status and message a parse threw, or a failure if it did not throw at all. */
const rejection = (run: () => unknown): { status?: number; message: string } => {
  try {
    run();
  } catch (error) {
    return { status: (error as HttpError).status, message: (error as Error).message };
  }
  throw new Error('expected the body to be rejected');
};

describe('parseEntityBody', () => {
  it('accepts a valid create body unchanged', () => {
    expect(parseEntityBody(accounts, VALID_ACCOUNT, { mode: 'create' })).toEqual(VALID_ACCOUNT);
  });

  it('names an unknown field', () => {
    const { status, message } = rejection(() =>
      parseEntityBody(accounts, { ...VALID_ACCOUNT, nickname: 'Spending' }, { mode: 'create' }),
    );

    expect(status).toBe(400);
    expect(message).toBe('Unknown field "nickname" for accounts');
  });

  it('names a field whose type is wrong, and says what it expected', () => {
    expect(
      rejection(() =>
        parseEntityBody(accounts, { ...VALID_ACCOUNT, openingBalance: '100' }, { mode: 'create' }),
      ).message,
    ).toBe('Invalid value for "openingBalance": expected a number');

    expect(
      rejection(() =>
        parseEntityBody(accounts, { ...VALID_ACCOUNT, archived: 'yes' }, { mode: 'create' }),
      ).message,
    ).toBe('Invalid value for "archived": expected a boolean');
  });

  it('rejects a value outside the column’s union, listing the union', () => {
    expect(
      rejection(() =>
        parseEntityBody(accounts, { ...VALID_ACCOUNT, type: 'crypto' }, { mode: 'create' }),
      ).message,
    ).toBe('Invalid value for "type": expected one of checking, savings, joint, invest');
  });

  it('names a missing required field on create, but not on patch', () => {
    const withoutName: Record<string, unknown> = { ...VALID_ACCOUNT };
    delete withoutName['name'];

    expect(
      rejection(() => parseEntityBody(accounts, withoutName, { mode: 'create' })).message,
    ).toBe('Missing required field "name"');
    expect(parseEntityBody(accounts, withoutName, { mode: 'patch' })).toEqual(withoutName);
  });

  it('rejects a body that is not an object at all', () => {
    expect(rejection(() => parseEntityBody(accounts, [1, 2], { mode: 'patch' })).message).toBe(
      'Request body must be a JSON object',
    );
  });

  it('turns null on an optional column into a clear, and refuses it on a required one', () => {
    expect(parseEntityBody(accounts, { iban: null }, { mode: 'patch' })).toEqual({ iban: null });
    expect(
      rejection(() => parseEntityBody(accounts, { name: null }, { mode: 'patch' })).message,
    ).toContain('"name"');
  });

  it('ignores id and userId instead of honouring them', () => {
    expect(
      parseEntityBody(accounts, { ...VALID_ACCOUNT, id: 9, userId: 4 }, { mode: 'create' }),
    ).toEqual(VALID_ACCOUNT);
  });

  it('rejects a server-derived column like any other unknown field', () => {
    const { message } = rejection(() =>
      parseEntityBody(
        transactions,
        { reimbursementTransferId: 3 },
        { mode: 'patch', derived: ['reimbursementTransferId'] },
      ),
    );

    expect(message).toBe('Unknown field "reimbursementTransferId" for transactions');
  });

  it('requires an integer where the column is an integer', () => {
    expect(
      rejection(() => parseEntityBody(transactions, { accountId: 1.5 }, { mode: 'patch' })).message,
    ).toBe('Invalid value for "accountId": expected an integer');
  });
});

describe('parseEntityBody: JSON column shape', () => {
  it('rejects an object where the entity type says array, and the reverse', () => {
    // `$type<number[]>` is erased at runtime, so "is an object" used to be the whole check — and a
    // 200 carrying `{}` for `coOwners` is a `.map()` throwing in the browser.
    expect(
      rejection(() =>
        parseEntityBody(accounts, { ...VALID_ACCOUNT, coOwners: {} }, { mode: 'create' }),
      ).message,
    ).toBe('Invalid value for "coOwners": expected an array');
    expect(
      rejection(() => parseEntityBody(transactions, { rawRow: [] }, { mode: 'patch' })).message,
    ).toBe('Invalid value for "rawRow": expected an object');
  });

  it('accepts each in its declared shape', () => {
    expect(
      parseEntityBody(accounts, { ...VALID_ACCOUNT, coOwners: [] }, { mode: 'create' })['coOwners'],
    ).toEqual([]);
    expect(
      parseEntityBody(transactions, { rawRow: { Date: '2026-03-01' } }, { mode: 'patch' })[
        'rawRow'
      ],
    ).toEqual({ Date: '2026-03-01' });
  });
});

describe('asReplacement', () => {
  it('clears the optional columns the caller left out', () => {
    expect(asReplacement(salaryMetadata, { yearMonth: '2026-03', grossWage: 4200 })).toEqual({
      yearMonth: '2026-03',
      grossWage: 4200,
      bonus: null,
      note: null,
    });
  });
});

describe('toId and parseIdQuery', () => {
  it('accepts only positive integers', () => {
    expect(toId('12')).toBe(12);
    expect(toId(12)).toBe(12);
    expect(toId('0')).toBeUndefined();
    expect(toId('-3')).toBeUndefined();
    expect(toId('1.5')).toBeUndefined();
    expect(toId('abc')).toBeUndefined();
    expect(toId(undefined)).toBeUndefined();
  });

  it('does not reinterpret an id the caller did not write', () => {
    // Bare `Number()` reads all four of these as a different, existing row.
    expect(toId('0x10')).toBeUndefined();
    expect(toId('1e1')).toBeUndefined();
    expect(toId(' 1')).toBeUndefined();
    expect(toId('+1')).toBeUndefined();
  });

  it('treats an absent query parameter as no filter, and a broken one as a 400', () => {
    expect(parseIdQuery({}, 'accountId')).toBeUndefined();
    expect(parseIdQuery({ accountId: '7' }, 'accountId')).toBe(7);
    expect(rejection(() => parseIdQuery({ accountId: 'x' }, 'accountId')).message).toBe(
      'Invalid value for "accountId": expected an integer',
    );
  });
});
