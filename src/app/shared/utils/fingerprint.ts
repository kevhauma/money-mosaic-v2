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

const fnv1a = (value: string): string => {
  let hash = 0x811c9dc5;
  for (let i = 0; i < value.length; i++) {
    hash ^= value.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(16).padStart(8, '0');
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
  return fnv1a(key);
};
