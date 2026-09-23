import { describe, expect, it, vi } from 'vitest';

const timingSafeEqualCalls = vi.hoisted(() => vi.fn());

// The one behaviour a black-box test cannot see: that the comparison goes through
// `timingSafeEqual` rather than `===`. The mock delegates to the real implementation and only
// records that it was reached.
vi.mock('node:crypto', async (importOriginal) => {
  const actual = await importOriginal<typeof import('node:crypto')>();
  return {
    ...actual,
    timingSafeEqual: (a: NodeJS.ArrayBufferView, b: NodeJS.ArrayBufferView): boolean => {
      timingSafeEqualCalls();
      return actual.timingSafeEqual(a, b);
    },
  };
});

const { hashPassword, unmatchableDigest, verifyPassword } = await import('./passwords.js');

describe('auth: hashPassword', () => {
  it('gives two users with the same password different salts and different hashes', async () => {
    const first = await hashPassword('admin');
    const second = await hashPassword('admin');

    expect(first.passwordSalt).not.toBe(second.passwordSalt);
    expect(first.passwordHash).not.toBe(second.passwordHash);
  });

  it('stores hex, never the password itself', async () => {
    const digest = await hashPassword('hunter2');

    expect(digest.passwordHash).toMatch(/^scrypt\$16384\$8\$1\$[0-9a-f]{128}$/);
    expect(digest.passwordSalt).toMatch(/^[0-9a-f]{32}$/);
    expect(JSON.stringify(digest)).not.toContain('hunter2');
  });

  it('records the scrypt parameters in the digest, so the cost can be raised later', async () => {
    const digest = await hashPassword('admin');
    const [algorithm, N, r, p] = digest.passwordHash.split('$');

    expect({ algorithm, N, r, p }).toEqual({ algorithm: 'scrypt', N: '16384', r: '8', p: '1' });
  });
});

describe('auth: verifyPassword', () => {
  it('accepts the right password and rejects the wrong one, via timingSafeEqual', async () => {
    const digest = await hashPassword('admin');
    timingSafeEqualCalls.mockClear();

    await expect(verifyPassword('admin', digest)).resolves.toBe(true);
    await expect(verifyPassword('Admin', digest)).resolves.toBe(false);
    expect(timingSafeEqualCalls).toHaveBeenCalledTimes(2);
  });

  it('verifies a digest using the parameters that digest recorded, not the current ones', async () => {
    const digest = await hashPassword('admin');
    // What a row written by a future, more expensive default would look like to today's code.
    const retagged = { ...digest, passwordHash: digest.passwordHash.replace('$16384$', '$8192$') };

    // Re-derived at N=8192, so it no longer matches — but it is read, not rejected as unparseable.
    await expect(verifyPassword('admin', retagged)).resolves.toBe(false);
    await expect(verifyPassword('admin', digest)).resolves.toBe(true);
  });

  it('rejects rather than throws when the stored digest is not a usable hash', async () => {
    await expect(
      verifyPassword('admin', { passwordHash: 'deadbeef', passwordSalt: 'aa' }),
    ).resolves.toBe(false);
    await expect(
      verifyPassword('admin', { ...(await hashPassword('admin')), passwordSalt: '' }),
    ).resolves.toBe(false);
    // A digest in the pre-`scrypt$` bare-hex format is not one this code ever wrote.
    await expect(
      verifyPassword('admin', { passwordHash: 'a'.repeat(128), passwordSalt: 'bb' }),
    ).resolves.toBe(false);
  });
});

describe('auth: unmatchableDigest', () => {
  it('is a real digest that no password matches', async () => {
    const digest = await unmatchableDigest();

    expect(digest.passwordHash).toMatch(/^scrypt\$/);
    await expect(verifyPassword('', digest)).resolves.toBe(false);
    await expect(verifyPassword('admin', digest)).resolves.toBe(false);
  });
});
