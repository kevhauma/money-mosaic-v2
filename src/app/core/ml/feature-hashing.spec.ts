import { DEFAULT_FEATURE_CONFIG } from './model-config';
import { charNgrams, extractFeatures, hashToken, tokenize } from './feature-hashing';

describe('tokenize', () => {
  it('lowercases and splits on non-alphanumeric boundaries', () => {
    expect(tokenize('Coffee & Co. #42')).toEqual(['coffee', 'co', '42']);
  });

  it('drops empty tokens from leading/trailing/repeated separators', () => {
    expect(tokenize('  ---hello---world---  ')).toEqual(['hello', 'world']);
  });
});

describe('charNgrams', () => {
  it('produces every substring of each length in [min, max]', () => {
    expect(charNgrams('abcd', 2, 3)).toEqual(['ab', 'bc', 'cd', 'abc', 'bcd']);
  });

  it('returns nothing for lengths longer than the text', () => {
    expect(charNgrams('ab', 3, 4)).toEqual([]);
  });

  it('lowercases before generating n-grams', () => {
    expect(charNgrams('AB', 1, 1)).toEqual(['a', 'b']);
  });
});

describe('hashToken', () => {
  it('is deterministic: the same string always hashes to the same number', () => {
    expect(hashToken('groceries')).toBe(hashToken('groceries'));
  });

  it('has no external dependency and returns an unsigned 32-bit integer', () => {
    const hash = hashToken('anything');
    expect(Number.isInteger(hash)).toBe(true);
    expect(hash).toBeGreaterThanOrEqual(0);
    expect(hash).toBeLessThanOrEqual(0xffffffff);
  });
});

describe('extractFeatures', () => {
  it('always returns a Float32Array of exactly config.dim length', () => {
    const config = { dim: 64, charNgramMin: 3, charNgramMax: 4 };
    expect(extractFeatures({ rawDescription: '', amount: 0 }, config).length).toBe(64);
    expect(
      extractFeatures(
        { rawDescription: 'a very long description with many words', amount: 0 },
        config,
      ).length,
    ).toBe(64);
  });

  it('writes the amount sign into the reserved last slot, untouched by hashing', () => {
    const config = { dim: 64, charNgramMin: 3, charNgramMax: 4 };
    const positive = extractFeatures({ rawDescription: 'Salary', amount: 100 }, config);
    const negative = extractFeatures({ rawDescription: 'Salary', amount: -100 }, config);
    const zero = extractFeatures({ rawDescription: 'Salary', amount: 0 }, config);

    expect(positive[config.dim - 1]).toBe(1);
    expect(negative[config.dim - 1]).toBe(-1);
    expect(zero[config.dim - 1]).toBe(0);
  });

  it('is deterministic: identical input + config produces an identical vector', () => {
    const config = DEFAULT_FEATURE_CONFIG;
    const input = { rawDescription: 'Grocery Store', counterpartyName: 'Big Mart', amount: -42.5 };

    expect(extractFeatures(input, config)).toEqual(extractFeatures(input, config));
  });

  it('hashes completely different text to different vectors', () => {
    const config = DEFAULT_FEATURE_CONFIG;
    const a = extractFeatures({ rawDescription: 'Grocery Store Purchase', amount: -20 }, config);
    const b = extractFeatures({ rawDescription: 'Monthly Salary Deposit', amount: -20 }, config);

    expect(a).not.toEqual(b);
  });

  it('folds counterparty n-grams at the configured min/max into the vector', () => {
    const withNgrams = extractFeatures(
      { rawDescription: '', counterpartyName: 'Acme', amount: 0 },
      { dim: 4096, charNgramMin: 2, charNgramMax: 3 },
    );
    const withoutCounterparty = extractFeatures(
      { rawDescription: '', amount: 0 },
      { dim: 4096, charNgramMin: 2, charNgramMax: 3 },
    );

    expect(withNgrams).not.toEqual(withoutCounterparty);
  });
});
