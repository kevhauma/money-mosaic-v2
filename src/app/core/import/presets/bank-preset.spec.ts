import { detectBankPreset } from './index';
import { KBC_PRESET } from './kbc.preset';
import { BELFIUS_PRESET } from './belfius.preset';

describe('detectBankPreset: matching', () => {
  it('detects KBC from an exact header set', () => {
    expect(detectBankPreset(KBC_PRESET.headerSignature)?.id).toBe('kbc');
  });

  it('detects KBC when headers are reordered and mixed case', () => {
    const shuffled = [...KBC_PRESET.headerSignature]
      .reverse()
      .map((header) => header.toUpperCase());
    expect(detectBankPreset(shuffled)?.id).toBe('kbc');
  });

  it('detects Belfius from an exact header set', () => {
    expect(detectBankPreset(BELFIUS_PRESET.headerSignature)?.id).toBe('belfius');
  });

  it('returns null for unrelated/generic headers', () => {
    expect(detectBankPreset(['Date', 'Amount', 'Description'])).toBeNull();
  });

  it('still matches when parsed headers are a superset of the signature', () => {
    const withExtraColumn = [...KBC_PRESET.headerSignature, 'Some Extra Column'];
    expect(detectBankPreset(withExtraColumn)?.id).toBe('kbc');
  });
});
