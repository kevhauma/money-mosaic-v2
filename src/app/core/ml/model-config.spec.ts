import {
  DEFAULT_FEATURE_CONFIG,
  MIN_CATEGORIES,
  MIN_TRAINING_LABELS,
  MODEL_SCHEMA_VERSION,
  RULE_PROPOSAL_MIN_CONFIDENCE,
  RULE_PROPOSAL_MIN_SUPPORT,
  taxonomySignature,
} from './model-config';

describe('taxonomySignature', () => {
  it('returns the same signature regardless of input array order', () => {
    const categories = [
      { id: 1, name: 'Groceries' },
      { id: 2, name: 'Rent' },
      { id: 3, name: 'Salary' },
    ];

    expect(taxonomySignature(categories)).toBe(taxonomySignature([...categories].reverse()));
  });

  it('changes when a category is renamed', () => {
    const before = [{ id: 1, name: 'Groceries' }];
    const after = [{ id: 1, name: 'Food' }];

    expect(taxonomySignature(before)).not.toBe(taxonomySignature(after));
  });

  it('changes when a category is added', () => {
    const before = [{ id: 1, name: 'Groceries' }];
    const after = [
      { id: 1, name: 'Groceries' },
      { id: 2, name: 'Rent' },
    ];

    expect(taxonomySignature(before)).not.toBe(taxonomySignature(after));
  });

  it('changes when a category is removed', () => {
    const before = [
      { id: 1, name: 'Groceries' },
      { id: 2, name: 'Rent' },
    ];
    const after = [{ id: 1, name: 'Groceries' }];

    expect(taxonomySignature(before)).not.toBe(taxonomySignature(after));
  });

  it('changes when membership changes even with the same set size', () => {
    const before = [
      { id: 1, name: 'Groceries' },
      { id: 2, name: 'Rent' },
    ];
    const after = [
      { id: 1, name: 'Groceries' },
      { id: 3, name: 'Rent' },
    ];

    expect(taxonomySignature(before)).not.toBe(taxonomySignature(after));
  });

  it('is stable across repeated calls with the same input', () => {
    const categories = [{ id: 1, name: 'Groceries' }];

    expect(taxonomySignature(categories)).toBe(taxonomySignature(categories));
  });
});

describe('model-config thresholds', () => {
  it('matches the documented values', () => {
    expect(DEFAULT_FEATURE_CONFIG).toEqual({ dim: 8192, charNgramMin: 3, charNgramMax: 4 });
    expect(MODEL_SCHEMA_VERSION).toBe(1);
    expect(MIN_TRAINING_LABELS).toBe(25);
    expect(MIN_CATEGORIES).toBe(2);
    expect(RULE_PROPOSAL_MIN_SUPPORT).toBe(4);
    expect(RULE_PROPOSAL_MIN_CONFIDENCE).toBe(0.85);
  });
});
