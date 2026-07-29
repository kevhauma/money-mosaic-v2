import { FIELD_LABELS } from './rule-labels';
import { CONDITION_FIELD_OPTIONS, editorKindFor } from './rule-condition-editor';

describe('editorKindFor (TICKET-CAT-08)', () => {
  it('picks the account editor for the accountId field', () => {
    expect(editorKindFor('accountId', 'equals')).toBe('account');
  });

  it('picks the between editor for a between operator', () => {
    expect(editorKindFor('amount', 'between')).toBe('between');
  });

  it('picks the numeric editor for a numeric field on a single-value operator', () => {
    expect(editorKindFor('amount', 'equals')).toBe('numeric');
    expect(editorKindFor('amount', '>')).toBe('numeric');
    expect(editorKindFor('amount', '<')).toBe('numeric');
  });

  it('picks the text editor for every text field and operator', () => {
    expect(editorKindFor('description', 'contains')).toBe('text');
    expect(editorKindFor('counterpartyName', 'equals')).toBe('text');
    expect(editorKindFor('counterpartyIban', 'regex')).toBe('text');
  });

  // Preserves the pre-extraction template's branch order (`isAccountField` was checked before
  // `isBetween`). `accountId` only permits `equals` today, so this combination is unreachable
  // through the UI — the assertion pins the precedence rather than a user-facing behaviour.
  it('prefers the account editor over between when both would match', () => {
    expect(editorKindFor('accountId', 'between')).toBe('account');
  });
});

describe('CONDITION_FIELD_OPTIONS', () => {
  it('offers every labelled field, in label-map order', () => {
    expect(CONDITION_FIELD_OPTIONS).toEqual(
      Object.entries(FIELD_LABELS).map(([value, label]) => ({ value, label })),
    );
  });
});
