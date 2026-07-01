import type { MappingProfile } from '@/core/data-access';
import { matchTemplateForHeaders } from './mapping-profiles.store';

const KBC_TEMPLATE: MappingProfile = {
  name: 'KBC',
  bankPreset: 'kbc',
  headerSignature: [
    'Rekeningnummer',
    'Boekingsdatum',
    'Bedrag',
    'Munt',
    'Omschrijving',
    'Naam tegenpartij',
    'Rekeningnummer tegenpartij',
  ],
  columns: { date: 'Boekingsdatum', description: 'Omschrijving' },
  delimiter: ';',
  decimalSeparator: ',',
  dateFormat: 'DD/MM/YYYY',
  encoding: 'windows-1252',
  headerRows: 1,
  signConvention: 'as-is',
};

const BELFIUS_TEMPLATE: MappingProfile = {
  ...KBC_TEMPLATE,
  name: 'Belfius',
  bankPreset: 'belfius',
  headerSignature: [
    'Rekening',
    'Boekingsdatum',
    'Bedrag',
    'Munt',
    'Omschrijving',
    'Naam tegenpartij',
  ],
};

const TEMPLATES = [KBC_TEMPLATE, BELFIUS_TEMPLATE];

describe('matchTemplateForHeaders: bank template detection', () => {
  it('detects KBC from an exact header set', () => {
    expect(matchTemplateForHeaders(TEMPLATES, KBC_TEMPLATE.headerSignature!)?.bankPreset).toBe(
      'kbc',
    );
  });

  it('detects KBC when headers are reordered and mixed case', () => {
    const shuffled = [...KBC_TEMPLATE.headerSignature!]
      .reverse()
      .map((header) => header.toUpperCase());
    expect(matchTemplateForHeaders(TEMPLATES, shuffled)?.bankPreset).toBe('kbc');
  });

  it('detects Belfius from an exact header set', () => {
    expect(matchTemplateForHeaders(TEMPLATES, BELFIUS_TEMPLATE.headerSignature!)?.bankPreset).toBe(
      'belfius',
    );
  });

  it('returns undefined for unrelated/generic headers', () => {
    expect(matchTemplateForHeaders(TEMPLATES, ['Date', 'Amount', 'Description'])).toBeUndefined();
  });

  it('still matches when parsed headers are a superset of the signature', () => {
    const withExtraColumn = [...KBC_TEMPLATE.headerSignature!, 'Some Extra Column'];
    expect(matchTemplateForHeaders(TEMPLATES, withExtraColumn)?.bankPreset).toBe('kbc');
  });

  it('ignores saved profiles that have no header signature', () => {
    const savedProfile: MappingProfile = { ...KBC_TEMPLATE, headerSignature: undefined };
    expect(matchTemplateForHeaders([savedProfile], KBC_TEMPLATE.headerSignature!)).toBeUndefined();
  });
});
