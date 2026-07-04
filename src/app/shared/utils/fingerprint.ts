export type FingerprintInput = {
  accountId: number;
  bookingDate: string;
  amount: number;
  description: string;
  counterpartyIban?: string;
  statementReference?: string;
};

export const normalizeDescription = (description: string): string =>
  description.trim().toLowerCase().replace(/\s+/g, ' ');

const FNV64_OFFSET_BASIS = 0xcbf29ce484222325n;
const FNV64_PRIME = 0x00000100000001b3n;
const MASK64 = 0xffffffffffffffffn;

// 64-bit FNV-1a. Widened from 32 bits (CR-1.3): a collision silently drops a real transaction as a
// "duplicate" on import — the worst failure mode for a finance app — and 32 bits hits the birthday
// bound (~1% collision at ~10k rows) far too soon. 64 bits pushes that risk to negligible.
const fnv1a64 = (value: string): string => {
  let hash = FNV64_OFFSET_BASIS;
  for (let i = 0; i < value.length; i++) {
    hash ^= BigInt(value.charCodeAt(i));
    hash = (hash * FNV64_PRIME) & MASK64;
  }
  return hash.toString(16).padStart(16, '0');
};

export const computeFingerprint = (input: FingerprintInput): string => {
  const normalizedAmount = Math.round(input.amount * 100);
  const key = [
    input.accountId,
    input.bookingDate,
    normalizedAmount,
    normalizeDescription(input.description),
    input.counterpartyIban ?? '',
    input.statementReference ?? '',
  ].join('|');
  return fnv1a64(key);
};
