import { computeFingerprint, normalizeDescription, type FingerprintInput } from './fingerprint';

const baseInput: FingerprintInput = {
  accountId: 1,
  bookingDate: '2026-07-01',
  amount: -12.34,
  description: 'Carrefour Market',
  counterpartyIban: 'BE68539007547034',
};

describe('computeFingerprint: determinism', () => {
  it('produces the same fingerprint for identical input', () => {
    expect(computeFingerprint(baseInput)).toBe(computeFingerprint({ ...baseInput }));
  });

  it('is a 64-bit hash (16 hex chars) so import-time collisions stay negligible (CR-1.3)', () => {
    expect(computeFingerprint(baseInput)).toMatch(/^[0-9a-f]{16}$/);
  });

  it('two identical rows legitimately produce the same fingerprint', () => {
    const rowA = { ...baseInput };
    const rowB = { ...baseInput };
    expect(computeFingerprint(rowA)).toBe(computeFingerprint(rowB));
  });
});

describe('computeFingerprint: field sensitivity', () => {
  it('changes when accountId differs', () => {
    expect(computeFingerprint(baseInput)).not.toBe(
      computeFingerprint({ ...baseInput, accountId: 2 }),
    );
  });

  it('changes when bookingDate differs', () => {
    expect(computeFingerprint(baseInput)).not.toBe(
      computeFingerprint({ ...baseInput, bookingDate: '2026-07-02' }),
    );
  });

  it('changes when amount differs', () => {
    expect(computeFingerprint(baseInput)).not.toBe(
      computeFingerprint({ ...baseInput, amount: -12.35 }),
    );
  });

  it('changes when amount differs only past the cent, e.g. 10.1 vs 10.10 are equal but 10.10 vs 10.11 differ', () => {
    const a = computeFingerprint({ ...baseInput, amount: 10.1 });
    const b = computeFingerprint({ ...baseInput, amount: 10.1 });
    const c = computeFingerprint({ ...baseInput, amount: 10.11 });
    expect(a).toBe(b);
    expect(a).not.toBe(c);
  });

  it('changes when description differs (post-normalization)', () => {
    expect(computeFingerprint(baseInput)).not.toBe(
      computeFingerprint({ ...baseInput, description: 'Delhaize' }),
    );
  });

  it('changes when counterpartyIban differs, including undefined vs set', () => {
    expect(computeFingerprint(baseInput)).not.toBe(
      computeFingerprint({ ...baseInput, counterpartyIban: undefined }),
    );
    expect(computeFingerprint(baseInput)).not.toBe(
      computeFingerprint({ ...baseInput, counterpartyIban: 'BE71096123456769' }),
    );
  });
});

describe('normalizeDescription: normalization', () => {
  it('trims, lowercases, and collapses whitespace', () => {
    expect(normalizeDescription('  Carrefour   Market  ')).toBe('carrefour market');
  });

  it('produces the same fingerprint for descriptions differing only in case/whitespace', () => {
    const a = computeFingerprint({ ...baseInput, description: 'Carrefour Market' });
    const b = computeFingerprint({ ...baseInput, description: '  CARREFOUR   MARKET ' });
    expect(a).toBe(b);
  });
});
