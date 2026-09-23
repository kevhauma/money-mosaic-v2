import { randomBytes, scrypt, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';

const scryptAsync = promisify(scrypt) as (
  password: string,
  salt: Buffer,
  keylen: number,
  options: { N: number; r: number; p: number; maxmem: number },
) => Promise<Buffer>;

/** 16 random bytes per user, so the same password never produces the same digest twice. */
const SALT_BYTES = 16;

/** 64-byte derived key — scrypt's usual output width. */
const KEY_BYTES = 64;

/**
 * Pinned rather than left to Node's defaults, because they are written into every stored digest
 * and read back out to verify it. These happen to be Node's current defaults (~75ms per
 * derivation on a typical home machine, which is the point — it is meant to be slow).
 *
 * `maxmem` has to be raised alongside `N`: Node's default ceiling is 32MB and scrypt needs
 * roughly `128 * N * r` bytes, so anything past N=16384 fails without it.
 */
const SCRYPT_PARAMS = { N: 16384, r: 8, p: 1, maxmem: 64 * 1024 * 1024 } as const;

/** Identifies the digest format below, so a later format can be told apart from this one. */
const SCRYPT_PREFIX = 'scrypt';

export type PasswordDigest = {
  /**
   * The full self-describing digest: `scrypt$N$r$p$<hex hash>`. Storing the parameters alongside
   * the hash is what makes the cost raisable later — see `parseDigest`.
   */
  readonly passwordHash: string;
  /** Hex salt the digest was derived with. */
  readonly passwordSalt: string;
};

type ParsedDigest = {
  readonly params: { readonly N: number; readonly r: number; readonly p: number };
  readonly hash: Buffer;
};

/**
 * Reads a stored digest back into its parameters and hash. Returns `undefined` for anything that
 * is not a digest this code wrote — a truncated column, a hand-edited row, or a future format an
 * older binary is reading.
 */
const parseDigest = (passwordHash: string): ParsedDigest | undefined => {
  const parts = passwordHash.split('$');
  if (parts.length !== 5 || parts[0] !== SCRYPT_PREFIX) return undefined;

  const [, rawN, rawR, rawP, hex] = parts;
  const N = Number(rawN);
  const r = Number(rawR);
  const p = Number(rawP);
  if (!Number.isInteger(N) || !Number.isInteger(r) || !Number.isInteger(p)) return undefined;

  const hash = Buffer.from(hex, 'hex');
  return hash.length === KEY_BYTES ? { params: { N, r, p }, hash } : undefined;
};

/**
 * Hashes a password with `scrypt` from `node:crypto` — no dependency, and it keeps the SQLite file
 * (which gets copied around as a backup) from being a plaintext list of passwords people reused
 * elsewhere. The brief for this server is "not secure"; this is the small part that is worth doing
 * anyway. See TICKET-AUTH-01's notes.
 *
 * The salt is always generated here. It is deliberately not a parameter: a caller that passed a
 * constant would void the per-user-salt guarantee above, and nothing needs to.
 */
export const hashPassword = async (password: string): Promise<PasswordDigest> => {
  const salt = randomBytes(SALT_BYTES);
  const derived = await scryptAsync(password, salt, KEY_BYTES, SCRYPT_PARAMS);
  const { N, r, p } = SCRYPT_PARAMS;

  return {
    passwordHash: `${SCRYPT_PREFIX}$${N}$${r}$${p}$${derived.toString('hex')}`,
    passwordSalt: salt.toString('hex'),
  };
};

/**
 * Re-derives the digest with the parameters the stored digest records, and compares it with
 * `timingSafeEqual`. An unreadable digest compares false rather than throwing, so a hand-edited
 * database row fails the login instead of crashing the request.
 */
export const verifyPassword = async (
  password: string,
  digest: PasswordDigest,
): Promise<boolean> => {
  const parsed = parseDigest(digest.passwordHash);
  const salt = Buffer.from(digest.passwordSalt, 'hex');
  if (parsed === undefined || salt.length === 0) return false;

  const candidate = await scryptAsync(password, salt, KEY_BYTES, {
    ...parsed.params,
    maxmem: SCRYPT_PARAMS.maxmem,
  });
  return timingSafeEqual(parsed.hash, candidate);
};

/**
 * A digest no password can match, used to give an unknown identifier the same cost as a known one
 * — see the comment at the login route. Built once at module load.
 */
export const unmatchableDigest = async (): Promise<PasswordDigest> =>
  hashPassword(randomBytes(32).toString('hex'));
